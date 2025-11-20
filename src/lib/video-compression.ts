import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Readable } from 'node:stream'
import ffmpeg from 'fluent-ffmpeg'

export class VideoCompressionService {
  /**
   * Comprime um vídeo a partir de um arquivo já salvo em disco
   * @param inputPath - Caminho do arquivo de vídeo já salvo em disco
   * @param options - Opções de compressão
   * @returns Caminho do arquivo comprimido (não retorna buffer!)
   */
  async compressVideoFile(
    inputPath: string,
    options?: {
      maxWidth?: number
      maxHeight?: number
      videoBitrate?: string
      audioBitrate?: string
      maxFramerate?: number
      quality?: number
      minSizeToCompress?: number
    },
  ): Promise<string | null> {
    const videoId = randomUUID()
    const outputPath = join(tmpdir(), `${videoId}-compressed.mp4`)

    const {
      maxWidth = 720,
      maxHeight = 720,
      videoBitrate = '1M',
      audioBitrate = '64k',
      maxFramerate = 30,
      quality = 28,
      minSizeToCompress = 30 * 1024 * 1024, // 30MB (aumentado para evitar comprimir vídeos pequenos)
    } = options || {}

    // Limite máximo para compressão (vídeos muito grandes podem estourar memória)
    // AUMENTADO para 90MB - vídeos de celular de 1 minuto geralmente são 60-100MB
    // Usaremos configurações muito conservadoras para evitar estouro
    const MAX_SIZE_TO_COMPRESS = 90 * 1024 * 1024 // 90MB

    try {
      // Verificar tamanho do arquivo (já está salvo em disco)
      const stats = await stat(inputPath)

      // Vídeos muito pequenos não precisam de compressão
      if (stats.size < minSizeToCompress) {
        console.log(
          `ℹ️ Vídeo pequeno (${(stats.size / 1024 / 1024).toFixed(2)}MB), pulando compressão`,
        )
        await unlink(inputPath).catch(() => {})
        return null
      }

      // Vídeos muito grandes podem estourar memória - pular compressão
      if (stats.size > MAX_SIZE_TO_COMPRESS) {
        console.log(
          `⚠️ Vídeo muito grande (${(stats.size / 1024 / 1024).toFixed(2)}MB > ${MAX_SIZE_TO_COMPRESS / 1024 / 1024}MB), pulando compressão para evitar estouro de memória`,
        )
        await unlink(inputPath).catch(() => {})
        return null
      }

      // Obter metadados do vídeo
      const metadata = await this.getVideoMetadata(inputPath)

      // Comprimir vídeo usando FFmpeg
      await this.compressWithFFmpeg(inputPath, outputPath, {
        maxWidth,
        maxHeight,
        videoBitrate,
        audioBitrate,
        maxFramerate,
        quality,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalFramerate: metadata.framerate,
      })

      // Verificar tamanho do arquivo comprimido
      const compressedStats = await stat(outputPath)
      if (compressedStats.size >= stats.size) {
        console.log(
          '⚠️ Vídeo comprimido é maior que o original, mantendo original',
        )
        await unlink(outputPath).catch(() => {})
        // Limpar input também
        await unlink(inputPath).catch(() => {})
        return null
      }

      const compressionRatio =
        ((stats.size - compressedStats.size) / stats.size) * 100

      console.log(
        `✅ Vídeo comprimido: ${(stats.size / 1024 / 1024).toFixed(2)}MB → ${(compressedStats.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% redução)`,
      )

      // Limpar arquivo de input após compressão bem-sucedida
      await unlink(inputPath).catch(() => {})

      return outputPath // Retorna path, não buffer!
    } catch (error) {
      // Limpar arquivos em caso de erro
      await unlink(outputPath).catch(() => {})
      await unlink(inputPath).catch(() => {})
      throw error
    }
  }

  /**
   * Salva um stream em arquivo usando pipe (sem carregar na memória)
   * Com proteção contra fechamento prematuro do stream
   */
  private async saveStreamToFile(
    stream: Readable,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath)

      stream.pipe(writeStream, { end: true })

      stream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('finish', resolve)
    })
  }

  /**
   * Converte bitrate string (ex: "1M", "500k") para número
   */
  private parseBitrateToNumber(bitrate: string): number {
    const match = bitrate.match(/^(\d+)([kKmM])?$/)
    if (!match || !match[1]) return 1

    const value = Number.parseInt(match[1], 10)
    const unit = match[2]?.toLowerCase()

    if (unit === 'm') return value
    if (unit === 'k') return value / 1000
    return value
  }

  /**
   * Obtém metadados do vídeo (resolução, framerate, etc)
   */
  private async getVideoMetadata(videoPath: string): Promise<{
    width: number
    height: number
    framerate: number
    duration: number
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (error, metadata) => {
        if (error) {
          reject(error)
          return
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        )

        if (!videoStream) {
          reject(new Error('Nenhum stream de vídeo encontrado'))
          return
        }

        const width = videoStream.width || 720
        const height = videoStream.height || 720

        // Calcular framerate
        let framerate = 30
        if (videoStream.r_frame_rate?.includes('/')) {
          const parts = videoStream.r_frame_rate.split('/')
          const num = parts[0] ? Number(parts[0]) : 30
          const den = parts[1] ? Number(parts[1]) : 1
          framerate = den ? num / den : num
        } else if (videoStream.r_frame_rate) {
          framerate = Number(videoStream.r_frame_rate) || 30
        }

        const duration = metadata.format?.duration || 0

        resolve({ width, height, framerate, duration })
      })
    })
  }

  /**
   * Comprime vídeo usando FFmpeg com configurações otimizadas
   * Com timeout de 5 minutos para evitar processos travados
   */
  private async compressWithFFmpeg(
    inputPath: string,
    outputPath: string,
    options: {
      maxWidth: number
      maxHeight: number
      videoBitrate: string
      audioBitrate: string
      maxFramerate: number
      quality: number
      originalWidth: number
      originalHeight: number
      originalFramerate: number
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Timeout de 5 minutos para evitar processos travados
      const timeout = setTimeout(
        () => {
          reject(new Error('Timeout: Compressão demorou mais de 5 minutos'))
        },
        5 * 60 * 1000, // 5 minutos
      )
      const {
        maxWidth,
        maxHeight,
        videoBitrate,
        audioBitrate,
        maxFramerate,
        quality,
        originalWidth,
        originalHeight,
        originalFramerate,
      } = options

      // Calcular resolução mantendo aspect ratio
      let targetWidth = originalWidth
      let targetHeight = originalHeight

      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        const aspectRatio = originalWidth / originalHeight

        if (originalWidth > originalHeight) {
          // Landscape
          targetWidth = maxWidth
          targetHeight = Math.round(maxWidth / aspectRatio)
          if (targetHeight > maxHeight) {
            targetHeight = maxHeight
            targetWidth = Math.round(maxHeight * aspectRatio)
          }
        } else {
          // Portrait
          targetHeight = maxHeight
          targetWidth = Math.round(maxHeight * aspectRatio)
          if (targetWidth > maxWidth) {
            targetWidth = maxWidth
            targetHeight = Math.round(maxWidth / aspectRatio)
          }
        }

        // Garantir números pares (requisito do H.264)
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1
        targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1
      }

      // Determinar framerate
      const targetFramerate = Math.min(originalFramerate, maxFramerate)

      const command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          `-crf ${quality}`,
          '-preset ultrafast', // Máxima velocidade, mínimo uso de memória
          '-threads 1', // Limita threads para reduzir uso de RAM (60-80% menos)
          '-max_muxing_queue_size 256', // Reduzido ainda mais para economizar memória
          '-tune fastdecode', // Otimiza para decodificação rápida (menos memória)
          `-vf scale=${targetWidth}:${targetHeight}`, // Reduz resolução
          `-r ${targetFramerate}`,
          `-b:v ${videoBitrate}`,
          `-maxrate ${videoBitrate}`,
          `-bufsize ${this.parseBitrateToNumber(videoBitrate) * 2}M`,
          `-b:a ${audioBitrate}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-profile:v baseline', // Perfil mais simples = menos memória
          '-level 3.0', // Nível H.264 mais baixo = menos memória
          '-x264-params threads=1:thread-input=1', // Força FFmpeg a usar apenas 1 thread
          '-x264-params no-mbtree=1', // Desabilita macroblock tree (economiza memória)
          '-x264-params ref=1', // Reduz referência de frames (menos memória)
        ])
        .output(outputPath)
        .on('start', () => {
          console.log('🎬 Iniciando compressão de vídeo...')
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(
              `⏳ Compressão: ${Math.round(progress.percent)}% completo`,
            )
          }
        })
        .on('end', () => {
          clearTimeout(timeout)
          console.log('✅ Compressão concluída!')
          resolve()
        })
        .on('error', (error) => {
          clearTimeout(timeout)
          console.error('❌ Erro na compressão:', error.message)
          reject(
            new Error(
              `Falha ao comprimir vídeo: ${error.message}. O vídeo pode estar corrompido.`,
            ),
          )
        })

      command.run()
    })
  }
}
