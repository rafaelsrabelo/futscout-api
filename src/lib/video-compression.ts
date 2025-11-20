import { randomUUID } from 'node:crypto'
import { constants, createWriteStream } from 'node:fs'
import { access, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Readable } from 'node:stream'
import ffmpeg from 'fluent-ffmpeg'

export class VideoCompressionService {
  /**
   * Comprime um vídeo usando streams (não carrega tudo na memória)
   * @param inputStream - Stream do vídeo original
   * @param inputPath - Caminho temporário onde o stream será salvo
   * @param options - Opções de compressão
   * @returns Caminho do arquivo comprimido (não retorna buffer!)
   */
  async compressVideoStream(
    inputStream: Readable,
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
      minSizeToCompress = 20 * 1024 * 1024, // 20MB
    } = options || {}

    try {
      // Salvar stream em arquivo usando pipe (não carrega na memória)
      await this.saveStreamToFile(inputStream, inputPath)

      // Verificar tamanho do arquivo
      const stats = await stat(inputPath)
      if (stats.size < minSizeToCompress) {
        console.log(
          `ℹ️ Vídeo pequeno (${(stats.size / 1024 / 1024).toFixed(2)}MB), pulando compressão`,
        )
        return null // Retorna null para indicar que não precisa comprimir
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
        return null
      }

      const compressionRatio =
        ((stats.size - compressedStats.size) / stats.size) * 100

      console.log(
        `✅ Vídeo comprimido: ${(stats.size / 1024 / 1024).toFixed(2)}MB → ${(compressedStats.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% redução)`,
      )

      return outputPath // Retorna path, não buffer!
    } catch (error) {
      // Limpar arquivo de saída se houver erro
      try {
        await access(outputPath, constants.F_OK)
        await unlink(outputPath)
      } catch {
        // Ignorar
      }
      throw error
    }
  }

  /**
   * Salva um stream em arquivo usando pipe (sem carregar na memória)
   */
  private async saveStreamToFile(
    stream: Readable,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath)
      stream.pipe(writeStream)
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
      stream.on('error', reject)
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
          '-preset veryfast', // Balance entre memória e qualidade (melhor que ultrafast)
          `-vf scale=${targetWidth}:${targetHeight}`,
          `-r ${targetFramerate}`,
          `-b:v ${videoBitrate}`,
          `-maxrate ${videoBitrate}`,
          `-bufsize ${this.parseBitrateToNumber(videoBitrate) * 2}M`,
          `-b:a ${audioBitrate}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p',
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
          console.log('✅ Compressão concluída!')
          resolve()
        })
        .on('error', (error) => {
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
