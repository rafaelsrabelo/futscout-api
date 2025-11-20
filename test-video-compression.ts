#!/usr/bin/env tsx
/**
 * Script de teste para verificar compressão de vídeo e uso de memória
 * 
 * Uso: tsx test-video-compression.ts <caminho-do-video>
 * 
 * Exemplo: tsx test-video-compression.ts ./test-video.mp4
 */

import { createReadStream, stat } from 'node:fs'
import { promisify } from 'node:util'
import { VideoCompressionService } from './src/lib/video-compression.js'

const statAsync = promisify(stat)

async function testVideoCompression(videoPath: string) {
  console.log('🧪 Testando compressão de vídeo...\n')

  try {
    // Verificar se arquivo existe
    const stats = await statAsync(videoPath)
    const originalSizeMB = stats.size / (1024 * 1024)
    console.log(`📹 Vídeo original:`)
    console.log(`   Tamanho: ${originalSizeMB.toFixed(2)} MB`)
    console.log(`   Caminho: ${videoPath}\n`)

    // Medir memória antes
    const memBefore = process.memoryUsage()
    console.log(`💾 Memória antes:`)
    console.log(`   Heap Used: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   RSS: ${(memBefore.rss / 1024 / 1024).toFixed(2)} MB\n`)

    // Criar stream do vídeo
    const inputStream = createReadStream(videoPath)
    const { randomUUID } = await import('node:crypto')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const tempInputPath = join(tmpdir(), `${randomUUID()}-input.mp4`)

    // Salvar stream em arquivo temporário (simula o que acontece no controller)
    const { createWriteStream } = await import('node:fs')
    const writeStream = createWriteStream(tempInputPath)
    inputStream.pipe(writeStream)

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve())
      writeStream.on('error', reject)
      inputStream.on('error', reject)
    })

    console.log('✅ Stream salvo em arquivo temporário\n')

    // Comprimir vídeo
    console.log('🗜️ Iniciando compressão...\n')
    const compressionService = new VideoCompressionService()
    const startTime = Date.now()

    const compressedPath = await compressionService.compressVideoStream(
      createReadStream(tempInputPath),
      tempInputPath,
      {
        maxWidth: 720,
        maxHeight: 720,
        videoBitrate: '1M',
        audioBitrate: '64k',
        maxFramerate: 30,
        quality: 28,
        minSizeToCompress: 20 * 1024 * 1024, // 20MB
      },
    )

    const endTime = Date.now()
    const compressionTime = ((endTime - startTime) / 1000).toFixed(2)

    // Medir memória depois
    const memAfter = process.memoryUsage()
    console.log(`\n💾 Memória depois:`)
    console.log(`   Heap Used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   RSS: ${(memAfter.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Diferença Heap: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Diferença RSS: ${((memAfter.rss - memBefore.rss) / 1024 / 1024).toFixed(2)} MB\n`)

    if (compressedPath) {
      const compressedStats = await statAsync(compressedPath)
      const compressedSizeMB = compressedStats.size / (1024 * 1024)
      const reduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100

      console.log(`✅ Compressão concluída em ${compressionTime}s:`)
      console.log(`   Original: ${originalSizeMB.toFixed(2)} MB`)
      console.log(`   Comprimido: ${compressedSizeMB.toFixed(2)} MB`)
      console.log(`   Redução: ${reduction.toFixed(1)}%`)
      console.log(`   Arquivo: ${compressedPath}\n`)

      // Limpar arquivos temporários
      const { unlink } = await import('node:fs/promises')
      await unlink(tempInputPath).catch(() => {})
      await unlink(compressedPath).catch(() => {})
    } else {
      console.log(`ℹ️ Vídeo não foi comprimido (menor que 20MB ou compressão não necessária)\n`)
      const { unlink } = await import('node:fs/promises')
      await unlink(tempInputPath).catch(() => {})
    }

    // Verificar se uso de memória está dentro do esperado
    const maxMemoryMB = 200 // Limite esperado em MB
    const memoryUsedMB = (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)

    console.log(`📊 Análise de memória:`)
    if (memoryUsedMB < maxMemoryMB) {
      console.log(`   ✅ Uso de memória OK: ${memoryUsedMB.toFixed(2)} MB < ${maxMemoryMB} MB`)
    } else {
      console.log(`   ⚠️ Uso de memória alto: ${memoryUsedMB.toFixed(2)} MB > ${maxMemoryMB} MB`)
    }

    console.log(`\n✅ Teste concluído!`)
  } catch (error) {
    console.error('❌ Erro no teste:', error)
    process.exit(1)
  }
}

// Executar teste
const videoPath = process.argv[2]

if (!videoPath) {
  console.error('❌ Erro: Forneça o caminho do vídeo')
  console.log('Uso: tsx test-video-compression.ts <caminho-do-video>')
  process.exit(1)
}

testVideoCompression(videoPath)

