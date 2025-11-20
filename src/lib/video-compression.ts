import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { access, readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpeg from 'fluent-ffmpeg'

export class VideoCompressionService {
  /**
   * Comprime um vídeo para reduzir drasticamente o tamanho do arquivo
   * Estratégia similar ao WhatsApp: reduz resolução, bitrate e otimiza codec
   * @param videoBuffer - Buffer do vídeo original
   * @param options - Opções de compressão
   * @returns Buffer do vídeo comprimido
   */
  async compressVideo(
    videoBuffer: Buffer,
    options?: {
      maxWidth?: number // Largura máxima (padrão: 720)
      maxHeight?: number // Altura máxima (padrão: 720)
      videoBitrate?: string // Bitrate de vídeo (padrão: '1M' = 1 Mbps)
      audioBitrate?: string // Bitrate de áudio (padrão: '64k')
      maxFramerate?: number // Framerate máximo (padrão: 30)
      quality?: number // Qualidade 0-51, menor = melhor (padrão: 28, bom equilíbrio)
    },
  ): Promise<Buffer> {
    const videoId = randomUUID()
    const inputPath = join(tmpdir(), `${videoId}-input.mp4`)
    const outputPath = join(tmpdir(), `${videoId}-compressed.mp4`)

    const {
      maxWidth = 720,
      maxHeight = 720,
      videoBitrate = '1M', // 1 Mbps - similar ao WhatsApp
      audioBitrate = '64k', // 64 kbps - suficiente para áudio
      maxFramerate = 30,
      quality = 28, // CRF 28 - bom equilíbrio qualidade/tamanho
    } = options || {}

    try {
      // Salvar vídeo original temporariamente
      await writeFile(inputPath, videoBuffer)

      // Obter metadados do vídeo para decidir se precisa comprimir
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

      // Ler vídeo comprimido
      const compressedBuffer = await readFile(outputPath)

      // Se o vídeo comprimido for maior que o original, retornar o original
      // (pode acontecer com vídeos já muito comprimidos)
      if (compressedBuffer.length >= videoBuffer.length) {
        console.log(
          '⚠️ Vídeo comprimido é maior que o original, mantendo original',
        )
        return videoBuffer
      }

      const compressionRatio =
        ((videoBuffer.length - compressedBuffer.length) / videoBuffer.length) *
        100

      console.log(
        `✅ Vídeo comprimido: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% redução)`,
      )

      return compressedBuffer
    } finally {
      // Limpar arquivos temporários
      try {
        await access(inputPath, constants.F_OK)
        await unlink(inputPath)
      } catch (error) {
        // Ignorar
      }

      try {
        await access(outputPath, constants.F_OK)
        await unlink(outputPath)
      } catch (error) {
        // Ignorar
      }
    }
  }

  /**
   * Converte bitrate string (ex: "1M", "500k") para número
   */
  private parseBitrateToNumber(bitrate: string): number {
    const match = bitrate.match(/^(\d+)([kKmM])?$/)
    if (!match) return 1 // Default 1M se não conseguir parsear
    
    const value = Number.parseInt(match[1], 10)
    const unit = match[2]?.toLowerCase()
    
    if (unit === 'm') return value
    if (unit === 'k') return value / 1000
    return value // Se não tem unidade, assume M
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
        
        // Calcular framerate (formato pode ser "30/1" ou número)
        let framerate = 30
        if (videoStream.r_frame_rate?.includes('/')) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number)
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

      // Determinar framerate (não aumentar, apenas reduzir se muito alto)
      const targetFramerate = Math.min(originalFramerate, maxFramerate)

      const command = ffmpeg(inputPath)
        .videoCodec('libx264') // Codec H.264
        .audioCodec('aac') // Codec de áudio AAC
        .outputOptions([
          `-crf ${quality}`, // Constant Rate Factor (qualidade)
          '-preset medium', // Balance entre velocidade e compressão
          `-vf scale=${targetWidth}:${targetHeight}`, // Redimensionar
          `-r ${targetFramerate}`, // Framerate
          `-b:v ${videoBitrate}`, // Bitrate de vídeo
          `-maxrate ${videoBitrate}`, // Bitrate máximo
          `-bufsize ${this.parseBitrateToNumber(videoBitrate) * 2}M`, // Buffer size
          `-b:a ${audioBitrate}`, // Bitrate de áudio
          '-movflags +faststart', // Otimizar para streaming
          '-pix_fmt yuv420p', // Formato de pixel compatível
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🎬 Iniciando compressão de vídeo...')
          console.log(`📝 Comando: ${commandLine}`)
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

