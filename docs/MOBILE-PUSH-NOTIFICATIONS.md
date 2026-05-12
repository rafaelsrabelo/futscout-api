# 📲 Push Notifications — Mobile (Expo)

Documento para o time mobile implementar **registro, recebimento e deep link** de push notifications no app FutScout. Usa Expo Push Notifications (proxy oficial da Expo para APNs/FCM).

O contrato server-side completo está em `docs/push-notifications-backend.md`.

> **Atenção:** push notifications **não funcionam em Expo Go** desde o SDK 53 — só funcionam em **build EAS** (`dev-client` ou production build).

---

## 🎯 O que o mobile precisa fazer

1. **Pedir permissão** (iOS pede explicitamente; Android 13+ também).
2. **Pegar o `ExpoPushToken`** do device.
3. **Mandar pro backend** após login (`POST /push-tokens`).
4. **Apagar do backend** no logout (`DELETE /push-tokens/:token`).
5. **Receber a notificação** — mostrar banner em foreground e abrir tela certa ao tocar.

---

## 📦 Dependências

```bash
npx expo install expo-notifications expo-device
```

Já temos `expo-constants` no projeto — usado para o `projectId` (`expo.config.extra.eas.projectId`) e para um `installationId` por device.

---

## ⚙️ Configuração no `app.json`

```jsonc
"plugins": [
  // ...existentes
  [
    "expo-notifications",
    {
      "icon": "./assets/notification-icon.png",   // PNG branco transparente 96x96 (Android)
      "color": "#0a1a0f",                          // cor do badge no Android
      "defaultChannel": "default",
      "sounds": []                                 // futuro: sons custom
    }
  ]
]
```

- **iOS:** o plugin já cuida das capabilities (`Push Notifications` + `Background Modes > Remote notifications`) na próxima build EAS.
- **Android:** o canal `default` é criado em runtime pelo hook (ver §Hook). Sem precisar de FCM key nesta fase.

---

## 🌐 Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/push-tokens` | Registra/atualiza o token deste device para o usuário logado |
| `DELETE` | `/api/push-tokens/:token` | Remove o token (chamar no logout) |

**Auth:** `Authorization: Bearer <accessToken>`.

| Status comum | Quando |
|---|---|
| `201` | Token registrado (POST) |
| `204` | Token removido ou não existia (DELETE — idempotente) |
| `400` | `token` mal-formado (não bate com `ExponentPushToken[...]`) |
| `401` | JWT ausente/expirado |

---

## 1. `POST /api/push-tokens` — registrar

### Request

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxx]",
  "platform": "IOS",
  "deviceName": "iPhone 15",
  "deviceId": "ABC-123",
  "appVersion": "1.18.0"
}
```

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `token` | string | ✅ | Formato `ExponentPushToken[...]` |
| `platform` | `'IOS' \| 'ANDROID'` | ✅ | Use `Platform.OS` do RN |
| `deviceName` | string | opcional | Ex: `Device.deviceName` |
| `deviceId` | string | opcional | `Constants.sessionId` — usado para deduplicar tokens do mesmo aparelho |
| `appVersion` | string | opcional | `Constants.expoConfig?.version` |

### Response 201

```json
{ "id": "uuid", "token": "ExponentPushToken[...]" }
```

### Comportamento do backend (o que você precisa saber)

- **Upsert por `token`.** Re-registrar o mesmo token é seguro.
- Se o `token` já existir associado a outro `userId` (caso de troca de conta no mesmo device), é **reatribuído** ao usuário atual — você não precisa apagar o token antes.
- Se você mandar `deviceId`, tokens antigos do mesmo `deviceId + userId` são removidos antes do upsert. Evita 2 envios para o mesmo aparelho quando o Expo rotaciona o token.

### Quando chamar

- **Após login** (qualquer fluxo: credenciais, social, refresh).
- Em todo **start do app** se o usuário já estiver logado (renova `lastUsedAt` e cobre rotação de token).
- Use uma `ref` para evitar chamar várias vezes na mesma sessão.

---

## 2. `DELETE /api/push-tokens/:token` — remover

### Request

```
DELETE /api/push-tokens/ExponentPushToken%5Bxxxx%5D
```

⚠️ O `token` na URL precisa ser **`encodeURIComponent`**ado (tem `[` e `]`).

### Response 204

Sempre `204` — idempotente. Se o token não existe ou pertence a outro usuário, não vaza informação.

### Quando chamar

- **Antes de limpar a sessão no logout.** Guarde o último token salvo (ex.: `AsyncStorage` ou ref no store) e chame `DELETE` com ele.
- Se a chamada falhar (sem rede), seguir com o logout mesmo assim — o backend remove tokens inválidos automaticamente quando a próxima notificação for enviada (`DeviceNotRegistered`).

---

## 🧩 Service & interfaces

### `src/shared/interfaces/http/push-token.ts`

```ts
export type PushPlatform = 'IOS' | 'ANDROID'

export interface RegisterPushTokenParams {
  token: string
  platform: PushPlatform
  deviceName?: string
  deviceId?: string
  appVersion?: string
}
```

### `src/shared/services/pushNotifications.service.ts`

```ts
import { futscoutApiClient } from '../api/futscoutApiClient'
import type { RegisterPushTokenParams } from '../interfaces/http/push-token'

export const registerPushToken = async (params: RegisterPushTokenParams) => {
  const { data } = await futscoutApiClient.post('/push-tokens', params)
  return data as { id: string; token: string }
}

export const removePushToken = async (token: string) => {
  await futscoutApiClient.delete(`/push-tokens/${encodeURIComponent(token)}`)
}
```

---

## 🪝 Hook `usePushNotifications`

`src/shared/hooks/usePushNotifications.ts`

### Responsabilidades

1. **Apenas em device real** (`Device.isDevice`). Simuladores não recebem push.
2. **Criar canal Android `default`** (obrigatório para Android 8+).
3. **Pedir permissão** (`getPermissionsAsync` → `requestPermissionsAsync` se ainda não autorizou).
4. **Obter `ExpoPushToken`** via `getExpoPushTokenAsync({ projectId })`.
5. **Registrar no backend** (mutation) — só quando há `user`.
6. **Listener foreground** — banner via `setNotificationHandler` global.
7. **Listener de toque** — lê `data.screen` + `data.params` e chama `router.push`.

### Esqueleto

```ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'

import { useUserStore } from '../store/user-store'
import { registerPushToken } from '../services/pushNotifications.service'

// Handler global — banner aparece quando notificação chega em foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function usePushNotifications() {
  const user = useUserStore((s) => s.user)
  const registered = useRef(false)

  const { mutate: register } = useMutation({ mutationFn: registerPushToken })

  // 1) Registro do token quando o usuário loga.
  useEffect(() => {
    if (!user || registered.current) return
    registered.current = true

    ;(async () => {
      if (!Device.isDevice) return

      // Canal Android obrigatório (≥ 8).
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Padrão',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0a1a0f',
        })
      }

      // Permissão (idempotente — só pede se ainda não autorizou).
      const existing = await Notifications.getPermissionsAsync()
      let status = existing.status
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync()
        status = req.status
      }
      if (status !== 'granted') return

      // ExpoPushToken (precisa do projectId do EAS).
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      })

      register({
        token,
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        deviceName: Device.deviceName ?? undefined,
        deviceId: Constants.sessionId,
        appVersion: Constants.expoConfig?.version,
      })
    })().catch((err) => {
      registered.current = false
      console.warn('[push] register failed', err)
    })
  }, [user, register])

  // 2) Listeners — foreground + toque.
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // No-op por enquanto. Banner aparece via handler global.
      // Aqui é onde dá pra disparar refetch de queries relacionadas
      // (ex.: refetch de favoritos quando chega um type=favorite).
    })

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { screen?: string; params?: Record<string, string> }
          | undefined
        if (data?.screen) {
          router.push({
            pathname: data.screen as never,
            params: data.params,
          })
        }
      },
    )

    return () => {
      receivedSub.remove()
      responseSub.remove()
    }
  }, [])
}
```

### Integração no layout

Chamar **uma única vez** dentro do layout privado, depois da auth garantida:

```ts
// app/(private)/_layout.tsx
import { usePushNotifications } from '../../shared/hooks/usePushNotifications'

export default function PrivateLayout() {
  usePushNotifications()
  // ...resto
}
```

> O `Notifications.setNotificationHandler` fica no top-level do arquivo do hook (fora do componente) — assim ele é registrado uma única vez, garantindo banners em foreground em todas as telas.

---

## 🔗 Convenção do `data` (deep link)

O backend manda, no payload `data` da notificação, a tela alvo do app:

```json
{
  "type": "tournament",
  "screen": "/(private)/(tabs)/profile",
  "params": { "id": "abc" }
}
```

O hook lê `data.screen` + `data.params` e chama `router.push()`. Categorias previstas (alinhar com o admin):

| `type` | Tela alvo (exemplo) |
|---|---|
| `tournament` | rota de torneios |
| `favorite` | perfil do atleta |
| `scout` | perfil do atleta |
| `subscription` | aba de plano |
| `admin_broadcast` | home |

> **Defesa:** se `data.screen` apontar pra uma rota que não existe (mudou nome, etc.), o `router.push` falha silenciosamente. Vale envolver em `try/catch` e fallback pra home.

---

## 🚪 Logout — remover o token

No fluxo de logout, **antes** de limpar a sessão:

```ts
// Em algum lugar acessível ao logout
import AsyncStorage from '@react-native-async-storage/async-storage'
import { removePushToken } from '../services/pushNotifications.service'

const LAST_TOKEN_KEY = '@futscout/last-push-token'

// 1) Quando registra com sucesso, guarda
register(params, {
  onSuccess: () => {
    AsyncStorage.setItem(LAST_TOKEN_KEY, params.token)
  },
})

// 2) No logout
export async function logoutAndCleanup() {
  const token = await AsyncStorage.getItem(LAST_TOKEN_KEY)
  if (token) {
    await removePushToken(token).catch(() => {}) // best-effort
    await AsyncStorage.removeItem(LAST_TOKEN_KEY)
  }
  // ...limpar JWT, user store, etc.
}
```

Por que não derrubar via `getExpoPushTokenAsync` de novo no logout? Porque às vezes o token rotacionou e quem está no banco é o antigo — guardar o **token que efetivamente foi registrado** evita esse desalinhamento.

---

## 🧪 Teste manual

1. Build com EAS:
   ```bash
   eas build --profile development
   ```
2. Instalar a build no device, abrir o app, fazer login.
3. Verificar no Prisma Studio (`npm run studio` no backend) que apareceu uma linha em `push_tokens` com seu `userId`.
4. Disparar uma notificação:
   - Via **[Expo Push Tool](https://expo.dev/notifications)** (colar o token e título/corpo).
   - Ou via API:
     ```bash
     curl -X POST http://localhost:3333/api/admin/notifications/send \
       -H "Authorization: Bearer $ADMIN_JWT" \
       -H "Content-Type: application/json" \
       -d '{
         "title": "Teste",
         "body": "Mensagem",
         "audience": { "type": "USER_IDS", "userIds": ["<meu-userId>"] },
         "data": { "screen": "/(private)/(tabs)/profile" }
       }'
     ```
5. **App em background** → banner aparece. Tocar deve abrir a tela definida em `data.screen`.
6. **App em foreground** → banner também aparece (graças ao `setNotificationHandler`).
7. **Logout** → conferir que a linha some de `push_tokens`.

---

## ❗ Erros comuns

| Sintoma | Causa provável | Como diagnosticar |
|---|---|---|
| `getExpoPushTokenAsync` lança "projectId is required" | Faltou o EAS projectId no `app.json` | Rode `eas init` e confira `expo.extra.eas.projectId` |
| Token registrado mas notificação não chega | Build sendo testada no Expo Go | Use EAS dev-client ou production build |
| Permissão negada e não pergunta de novo | Usuário já recusou antes | Mostrar tela explicativa + link `Linking.openSettings()` |
| Notificação chega mas toque não navega | `data.screen` aponta pra rota inexistente | Conferir mapa de telas + envolver `router.push` em try/catch |
| 2 notificações por device | `deviceId` não está sendo enviado no register | Sempre mandar `Constants.sessionId` como `deviceId` |
| 400 ao registrar | Token não bate com `ExponentPushToken[...]` | Não tente registrar valores arbitrários no endpoint |

---

## ✅ Checklist de implementação

- [ ] `expo-notifications` + `expo-device` instalados.
- [ ] Plugin no `app.json` + ícone `assets/notification-icon.png` (96x96 branco transparente).
- [ ] `pushNotifications.service.ts` + interfaces tipadas.
- [ ] Hook `usePushNotifications` com permissão, registro e listeners.
- [ ] `Notifications.setNotificationHandler` no top-level do arquivo do hook.
- [ ] Hook chamado **uma única vez** no `(private)/_layout.tsx`.
- [ ] Canal Android `default` criado em runtime.
- [ ] Logout chama `removePushToken` antes de limpar a sessão.
- [ ] Token guardado em `AsyncStorage` (chave `@futscout/last-push-token`) pro logout.
- [ ] Deep link funcionando — `data.screen` + `data.params` → `router.push`.
- [ ] Testado em **build EAS** (não em Expo Go) em iOS e Android.

---

## 🚨 Pontos de atenção

- **Expo Go não suporta** push desde SDK 53. Não tente testar lá.
- **Simuladores não recebem** push (iOS simulator nem Android emulator nas versões antigas). Use device real.
- **Permissão é one-shot.** Se o usuário negar, você não consegue mais pedir — só mandar pra `Linking.openSettings()`. Considere uma tela educativa antes do prompt nativo.
- **Token pode rotacionar.** Re-registrar a cada start cobre isso (o upsert por `token` é idempotente).
- **`badge` só funciona no iOS.** O backend pode mandar o campo para Android; o sistema ignora.

---

## 🔮 Fora de escopo (fase 2+)

- Preferências por categoria (toggles "quero receber X").
- Notificações locais agendadas (lembretes).
- Rich media (imagens, ações inline).
- Som customizado por categoria.
- Apple Wallet / Google Wallet integration.
