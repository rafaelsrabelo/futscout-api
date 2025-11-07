import OpenAI from 'openai'
import { env } from '../env/index.js'

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

interface PerformanceAnalysisData {
  athleteProfile: {
    nickname: string
    primaryPosition: string
    age: number
    currentClub: string
  }
  match: {
    myTeam: string
    adversaryTeam: string
    result: string
    myTeamScore: number
    adversaryScore: number
    modality: string
    category: string
    approximateTime: number
  }
  plays: {
    playType: string
    rating: number
    approximateTime: number
    observations: string
  }[]
  stats: {
    totalPlays: number
    positiveActions: number
    negativeActions: number
    goals: number
    assists: number
    saves: number
    tackles: number
    fouls: number
    yellowCards: number
    redCards: number
    overallRating: number
  }
}

export async function generateAIPerformanceAnalysis(
  data: PerformanceAnalysisData,
): Promise<{
  performanceNote: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `
Você é um analista de performance esportiva especializado em futebol. Analise a performance do atleta com base nos dados abaixo e forneça uma análise detalhada, profissional e construtiva.

**DADOS DO ATLETA:**
- Nome: ${data.athleteProfile.nickname}
- Posição: ${data.athleteProfile.primaryPosition}
- Idade: ${data.athleteProfile.age} anos
- Clube: ${data.athleteProfile.currentClub}

**DADOS DA PARTIDA:**
- ${data.match.myTeam} vs ${data.match.adversaryTeam}
- Resultado: ${data.match.result} (${data.match.myTeamScore}-${data.match.adversaryScore})
- Modalidade: ${data.match.modality}
- Categoria: ${data.match.category}
- Tempo em campo: ${data.match.approximateTime} minutos

**ESTATÍSTICAS:**
- Total de ações: ${data.stats.totalPlays}
- Ações positivas: ${data.stats.positiveActions}
- Ações negativas: ${data.stats.negativeActions}
- Gols: ${data.stats.goals}
- Assistências: ${data.stats.assists}
- Defesas: ${data.stats.saves}
- Desarmes: ${data.stats.tackles}
- Faltas: ${data.stats.fouls}
- Cartões: ${data.stats.yellowCards} amarelos, ${data.stats.redCards} vermelhos
- Avaliação média: ${data.stats.overallRating}/5

**LANCES DETALHADOS:**
${data.plays
  .map(
    (play, index) =>
      `${index + 1}. ${play.playType} (${play.approximateTime}min) - Nota: ${play.rating}/5 - ${play.observations}`,
  )
  .join('\n')}

Com base nesses dados, forneça uma análise estruturada APENAS no formato JSON válido, sem texto adicional antes ou depois:

{
  "performanceNote": "Análise narrativa detalhada da performance (máximo 500 palavras)",
  "strengths": ["Array com 3-5 pontos fortes específicos"],
  "weaknesses": ["Array com 2-4 pontos de melhoria"],
  "recommendations": ["Array com 3-5 recomendações específicas para evolução"]
}

IMPORTANTE: 
- Responda APENAS com o JSON válido
- Não adicione texto explicativo antes ou depois
- Não use quebras de linha desnecessárias no JSON
- Escape caracteres especiais corretamente

Considere:
- A posição do jogador para contextualizar as ações
- O resultado da partida e como o jogador contribuiu
- Padrões identificados nos lances
- Aspectos técnicos, táticos e físicos
- Sugestões específicas e acionáveis
`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é um analista de performance esportiva. Responda SEMPRE com JSON válido, sem texto adicional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    console.log('OpenAI raw response:', response)

    // Tentar extrair JSON da resposta
    let jsonResponse
    try {
      // Primeiro tentar parsear diretamente
      jsonResponse = JSON.parse(response.trim())
    } catch (parseError) {
      console.log('Direct parse failed, trying regex extraction...')
      // Se falhar, tentar extrair JSON usando regex mais robusta
      const jsonMatch = response.match(/\{[\s\S]*?\}(?=\s*$|$)/s)
      if (jsonMatch) {
        try {
          jsonResponse = JSON.parse(jsonMatch[0])
        } catch (regexError) {
          console.error('Failed to parse JSON from regex match:', regexError)
          console.error('Regex match result:', jsonMatch[0])

          // Fallback: criar resposta básica
          return {
            performanceNote:
              'Análise de performance gerada com base nos dados da partida.',
            strengths: ['Participação ativa na partida'],
            weaknesses: ['Pontos de melhoria identificados'],
            recommendations: ['Continuar treinando regularmente'],
          }
        }
      } else {
        console.error('No JSON found in response:', response)

        // Fallback: criar resposta básica
        return {
          performanceNote:
            'Análise de performance gerada com base nos dados da partida.',
          strengths: ['Participação ativa na partida'],
          weaknesses: ['Pontos de melhoria identificados'],
          recommendations: ['Continuar treinando regularmente'],
        }
      }
    }

    // Validar se tem as propriedades esperadas
    if (
      !jsonResponse.performanceNote ||
      !jsonResponse.strengths ||
      !jsonResponse.weaknesses ||
      !jsonResponse.recommendations
    ) {
      console.error('Invalid response structure:', jsonResponse)

      // Fallback com dados parciais
      return {
        performanceNote:
          jsonResponse.performanceNote || 'Análise de performance gerada.',
        strengths: Array.isArray(jsonResponse.strengths)
          ? jsonResponse.strengths
          : ['Participação ativa'],
        weaknesses: Array.isArray(jsonResponse.weaknesses)
          ? jsonResponse.weaknesses
          : ['Pontos de melhoria'],
        recommendations: Array.isArray(jsonResponse.recommendations)
          ? jsonResponse.recommendations
          : ['Continuar treinando'],
      }
    }

    return jsonResponse
  } catch (error) {
    console.error('Error generating AI analysis:', error)
    throw new Error('Failed to generate AI performance analysis')
  }
}
