# Teste completo do upload de vídeo

## 1. Fazer login e pegar o token
curl -X POST \
  http://localhost:3333/api/auth/sessions \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "seu@email.com",
    "password": "suasenha"
  }'

## 2. Criar um lance (opcional, se não tiver)
curl -X POST \
  http://localhost:3333/api/matches/SEU_MATCH_ID/plays \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{
    "play_type": "GOAL",
    "rating": 5,
    "approximate_time": 45,
    "observations": "Gol de cabeça após escanteio"
  }'

## 3. Upload do vídeo para o lance
curl -X POST \
  http://localhost:3333/api/plays/SEU_PLAY_ID/video \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -F 'file=@/caminho/para/seu/video.mp4'

## Exemplo de resposta esperada:
{
  "message": "Vídeo adicionado ao lance com sucesso!",
  "play": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "playType": "GOAL",
    "videoUrl": "https://pub-seubucket.r2.dev/videos/1699564800000_video.mp4",
    "rating": 5,
    "approximateTime": 45,
    "observations": "Gol de cabeça após escanteio",
    "match": {
      "id": "match-id",
      "adversaryTeam": "Time Adversário",
      "date": "2025-11-09T10:00:00.000Z"
    }
  }
}