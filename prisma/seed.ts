import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.js'
import {
  Category,
  DominantFoot,
  Gender,
  Position,
} from '../generated/prisma/enums.js'

const prisma = new PrismaClient()

// Dados fake para times
const teamsData = [
  { name: 'Flamengo', acronym: 'FLA', category: Category.SUB_17 },
  { name: 'Flamengo', acronym: 'FLA', category: Category.SUB_20 },
  { name: 'Palmeiras', acronym: 'PAL', category: Category.SUB_17 },
  { name: 'Palmeiras', acronym: 'PAL', category: Category.SUB_20 },
  { name: 'São Paulo', acronym: 'SPO', category: Category.SUB_17 },
  { name: 'São Paulo', acronym: 'SPO', category: Category.SUB_20 },
  { name: 'Santos', acronym: 'SAN', category: Category.SUB_17 },
  { name: 'Santos', acronym: 'SAN', category: Category.SUB_20 },
  { name: 'Corinthians', acronym: 'COR', category: Category.SUB_17 },
  { name: 'Corinthians', acronym: 'COR', category: Category.SUB_20 },
  { name: 'Grêmio', acronym: 'GRE', category: Category.SUB_17 },
  { name: 'Grêmio', acronym: 'GRE', category: Category.SUB_20 },
  { name: 'Internacional', acronym: 'INT', category: Category.SUB_17 },
  { name: 'Internacional', acronym: 'INT', category: Category.SUB_20 },
  { name: 'Cruzeiro', acronym: 'CRU', category: Category.SUB_17 },
  { name: 'Cruzeiro', acronym: 'CRU', category: Category.SUB_20 },
  { name: 'Atlético-MG', acronym: 'CAM', category: Category.SUB_17 },
  { name: 'Atlético-MG', acronym: 'CAM', category: Category.SUB_20 },
  { name: 'Botafogo', acronym: 'BOT', category: Category.SUB_17 },
  { name: 'Botafogo', acronym: 'BOT', category: Category.SUB_20 },
]

// Nomes brasileiros para atletas
const firstNames = [
  'João',
  'Pedro',
  'Lucas',
  'Gabriel',
  'Rafael',
  'Mateus',
  'Felipe',
  'Bruno',
  'Carlos',
  'Diego',
  'Ana',
  'Maria',
  'Julia',
  'Beatriz',
  'Larissa',
  'Camila',
  'Fernanda',
  'Mariana',
  'Isabella',
  'Gabriela',
  'Thiago',
  'André',
  'Marcos',
  'Rodrigo',
  'Leandro',
  'Alexandre',
  'Daniel',
  'Ricardo',
  'Eduardo',
  'Vitor',
  'Carolina',
  'Amanda',
  'Natália',
  'Patrícia',
  'Renata',
  'Vanessa',
  'Cristina',
  'Monica',
  'Silvia',
  'Tatiana',
]

const lastNames = [
  'Silva',
  'Santos',
  'Oliveira',
  'Souza',
  'Rodrigues',
  'Ferreira',
  'Alves',
  'Pereira',
  'Lima',
  'Gomes',
  'Costa',
  'Ribeiro',
  'Martins',
  'Carvalho',
  'Almeida',
  'Lopes',
  'Soares',
  'Fernandes',
  'Vieira',
  'Barbosa',
]

// Função para gerar CPF fake
function generateFakeCPF(): string {
  const numbers = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  )
  return numbers.join('').padStart(11, '0')
}

// Função para gerar data de nascimento aleatória (entre 15 e 20 anos)
function generateBirthDate(): Date {
  const today = new Date()
  const age = Math.floor(Math.random() * 6) + 15 // 15-20 anos
  const birthYear = today.getFullYear() - age
  const birthMonth = Math.floor(Math.random() * 12)
  const birthDay = Math.floor(Math.random() * 28) + 1
  return new Date(birthYear, birthMonth, birthDay)
}

// Função para gerar altura aleatória (150-190cm)
function generateHeight(): number {
  return Math.floor(Math.random() * 40) + 150
}

// Função para gerar peso aleatório (50-90kg)
function generateWeight(): number {
  return Math.floor(Math.random() * 40) + 50
}

// Função para gerar CEP fake
function generateFakeCEP(): string {
  const numbers = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 10),
  )
  return numbers.join('')
}

// Função para gerar endereço fake
function generateFakeAddress() {
  const streets = [
    'Rua das Flores',
    'Avenida Brasil',
    'Rua da Paz',
    'Avenida Paulista',
    'Rua do Comércio',
  ]
  const districts = [
    'Centro',
    'Copacabana',
    'Ipanema',
    'Leblon',
    'Botafogo',
    'Flamengo',
    'Tijuca',
  ]
  const cities = [
    'Rio de Janeiro',
    'São Paulo',
    'Belo Horizonte',
    'Salvador',
    'Brasília',
  ]
  const states = ['RJ', 'SP', 'MG', 'BA', 'DF']

  return {
    street: streets[Math.floor(Math.random() * streets.length)],
    number: (Math.floor(Math.random() * 9999) + 1).toString(),
    district: districts[Math.floor(Math.random() * districts.length)],
    city: cities[Math.floor(Math.random() * cities.length)],
    state: states[Math.floor(Math.random() * states.length)],
    zipCode: generateFakeCEP(),
  }
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar times
  console.log('⚽ Criando times...')
  const teams = []
  for (const teamData of teamsData) {
    const team = await prisma.team.create({
      data: teamData,
    })
    teams.push(team)
  }
  console.log(`✅ ${teams.length} times criados`)

  // Criar usuários e perfis
  console.log('👥 Criando usuários e perfis de atletas...')
  const users = []

  const usedNicknames = new Set<string>()

  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const fullName = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`

    // Gerar nickname único
    let nickname = firstName.toLowerCase()
    let counter = 1
    while (usedNicknames.has(nickname)) {
      nickname = `${firstName.toLowerCase()}${counter}`
      counter++
    }
    usedNicknames.add(nickname)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName, // Nome do usuário
        password: 'senha123', // Senha padrão para todos
        role: 'ATHLETE',
        isActive: true, // Ativamos todos para teste
        athleteProfile: {
          create: {
            cpf: generateFakeCPF(),
            gender: Math.random() > 0.7 ? Gender.FEMALE : Gender.MALE,
            nickname,
            profilePhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`,
            birthDate: generateBirthDate(),
            instagramUrl: `https://instagram.com/${nickname}`,
            twitterUrl: `https://twitter.com/${nickname}`,
            height: generateHeight(),
            weight: generateWeight(),
            dominantFoot:
              Math.random() > 0.1 ? DominantFoot.RIGHT : DominantFoot.LEFT,
            primaryPosition:
              Object.values(Position)[
                Math.floor(Math.random() * Object.values(Position).length)
              ],
            secondaryPosition:
              Math.random() > 0.5
                ? Object.values(Position)[
                    Math.floor(Math.random() * Object.values(Position).length)
                  ]
                : null,
            currentClub: teams[Math.floor(Math.random() * teams.length)].name,
            biography: `Atleta dedicado e apaixonado por futebol. ${fullName} começou a jogar aos 8 anos e tem grandes sonhos no esporte.`,
            hasManager: Math.random() > 0.6,
            managerName: Math.random() > 0.6 ? `Agente ${lastName}` : null,
            managerCompany:
              Math.random() > 0.6 ? `Sports Management ${lastName}` : null,
            managerContact:
              Math.random() > 0.6
                ? `contato@${lastName.toLowerCase()}sports.com`
                : null,
            address: {
              create: generateFakeAddress(),
            },
          },
        },
      },
      include: {
        athleteProfile: true,
      },
    })

    users.push(user)

    // Adicionar atleta a 1-3 times aleatórios
    const numberOfTeams = Math.floor(Math.random() * 3) + 1 // 1-3 times
    const selectedTeams = teams
      .sort(() => 0.5 - Math.random())
      .slice(0, numberOfTeams)

    for (const team of selectedTeams) {
      if (user.athleteProfile) {
        await prisma.athleteTeam.create({
          data: {
            athleteId: user.athleteProfile.id,
            teamId: team.id,
          },
        })
      }
    }

    console.log(`✅ Usuário ${i + 1}/50 criado: ${fullName}`)
  }

  console.log('🎉 Seed concluído com sucesso!')
  console.log('📊 Estatísticas:')
  console.log(`   - ${teams.length} times criados`)
  console.log(`   - ${users.length} usuários criados`)
  console.log(`   - ${users.length} perfis de atletas criados`)
  console.log(`   - ${users.length} endereços criados`)

  // Contar relacionamentos atleta-time
  const athleteTeamCount = await prisma.athleteTeam.count()
  console.log(`   - ${athleteTeamCount} relacionamentos atleta-time criados`)
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
