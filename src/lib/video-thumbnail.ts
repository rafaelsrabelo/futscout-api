import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { access, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpeg from 'fluent-ffmpeg'

export class VideoThumbnailService {
  /**
   * Gera um thumbnail de um vídeo a partir de um caminho de arquivo
   * @param videoPath - Caminho do arquivo de vídeo
   * @param timeInSeconds - Tempo em segundos para capturar o frame (padrão: 1 segundo)
   * @returns Buffer da imagem thumbnail (JPEG)
   */
  async generateThumbnailFromFile(
    videoPath: string,
    timeInSeconds = 1,
  ): Promise<Buffer> {
    const videoId = randomUUID()
    const thumbnailPath = join(tmpdir(), `${videoId}-thumb.jpg`)

    try {
      // Gerar thumbnail usando FFmpeg diretamente do arquivo
      await this.extractFrame(videoPath, thumbnailPath, timeInSeconds)

      // Ler thumbnail gerado
      const { readFile } = await import('node:fs/promises')
      const thumbnailBuffer = await readFile(thumbnailPath)

      return thumbnailBuffer
    } finally {
      // Limpar apenas o thumbnail temporário (o vídeo já existe no disco)
      try {
        await access(thumbnailPath, constants.F_OK)
        await unlink(thumbnailPath)
      } catch (error) {
        // Arquivo não existe ou erro ao deletar - ignorar
      }
    }
  }

  /**
   * Gera um thumbnail de um vídeo a partir de um buffer
   * @param videoBuffer - Buffer do vídeo
   * @param timeInSeconds - Tempo em segundos para capturar o frame (padrão: 1 segundo)
   * @returns Buffer da imagem thumbnail (JPEG)
   * @deprecated Use generateThumbnailFromFile para evitar carregar vídeo na memória
   */
  async generateThumbnail(
    videoBuffer: Buffer,
    timeInSeconds = 1,
  ): Promise<Buffer> {
    const videoId = randomUUID()
    const videoPath = join(tmpdir(), `${videoId}.mp4`)
    const thumbnailPath = join(tmpdir(), `${videoId}-thumb.jpg`)

    try {
      // Salvar vídeo temporariamente
      await writeFile(videoPath, videoBuffer)

      // Gerar thumbnail usando FFmpeg
      await this.extractFrame(videoPath, thumbnailPath, timeInSeconds)

      // Ler thumbnail gerado
      const { readFile } = await import('node:fs/promises')
      const thumbnailBuffer = await readFile(thumbnailPath)

      return thumbnailBuffer
    } finally {
      // Limpar arquivos temporários (apenas se existirem)
      try {
        await access(videoPath, constants.F_OK)
        await unlink(videoPath)
      } catch (error) {
        // Arquivo não existe ou erro ao deletar - ignorar
      }

      try {
        await access(thumbnailPath, constants.F_OK)
        await unlink(thumbnailPath)
      } catch (error) {
        // Arquivo não existe ou erro ao deletar - ignorar
      }
    }
  }

  /**
   * Extrai um frame do vídeo usando FFmpeg
   */
  private async extractFrame(
    videoPath: string,
    outputPath: string,
    timeInSeconds: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const folder = outputPath.substring(0, outputPath.lastIndexOf('/'))
      const filename = outputPath.split('/').pop() || 'thumb.jpg'

      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename,
          folder,
          size: '640x360', // Resolução do thumbnail (16:9)
        })
        .on('end', () => resolve())
        .on('error', (error) => {
          // Melhorar mensagem de erro
          const errorMessage =
            error.message || 'Erro desconhecido ao processar vídeo'
          reject(
            new Error(
              `FFmpeg falhou: ${errorMessage}. O vídeo pode estar corrompido ou em formato não suportado.`,
            ),
          )
        })
    })
  }

  /**
   * Gera thumbnail de um vídeo a partir de uma URL (baixa temporariamente usando stream)
   * Útil para gerar thumbnail de vídeos já no R2
   */
  async generateThumbnailFromUrl(
    videoUrl: string,
    timeInSeconds = 1,
  ): Promise<Buffer> {
    const videoId = randomUUID()
    const videoPath = join(tmpdir(), `${videoId}-video.mp4`)

    try {
      // Tentar baixar via API do R2 primeiro (mais confiável)
      const { CloudflareR2Service } = await import('./cloudflare-r2.js')
      const r2Service = new CloudflareR2Service()
      const key = r2Service.extractKeyFromUrl(videoUrl)

      let videoStream: NodeJS.ReadableStream | null = null

      if (key) {
        try {
          videoStream = await r2Service.downloadVideoStream(key)
        } catch (error) {
          videoStream = null
        }
      }

      // Se falhar via API, tentar via URL pública
      if (!videoStream) {
        // Timeout de 2 minutos para download
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000)

        const response = await fetch(videoUrl, {
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(
            `Failed to download video: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`,
          )
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        // Converter ReadableStream do fetch para Node.js Readable
        const { Readable } = await import('node:stream')
        const reader = response.body.getReader()
        videoStream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read()
              if (done) {
                this.push(null)
              } else {
                this.push(Buffer.from(value))
              }
            } catch (error) {
              this.destroy(error as Error)
            }
          },
        })
      }

      // Salvar vídeo em arquivo temporário
      const { createWriteStream } = await import('node:fs')
      const { pipeline } = await import('node:stream/promises')
      const writeStream = createWriteStream(videoPath)
      await pipeline(videoStream, writeStream)

      // Gerar thumbnail
      const thumbnail = await this.generateThumbnailFromFile(
        videoPath,
        timeInSeconds,
      )

      return thumbnail
    } catch (error) {
      console.error('❌ Erro ao gerar thumbnail de URL:', error)
      throw error
    } finally {
      // Limpar vídeo temporário
      try {
        await access(videoPath, constants.F_OK)
        await unlink(videoPath)
      } catch (error) {
        // Arquivo não existe ou erro ao deletar - ignorar
      }
    }
  }

  /**
   * Obtém a duração do vídeo em segundos
   */
  async getVideoDuration(videoBuffer: Buffer): Promise<number> {
    const videoId = randomUUID()
    const videoPath = join(tmpdir(), `${videoId}.mp4`)

    try {
      await writeFile(videoPath, videoBuffer)

      return await this.extractDuration(videoPath)
    } finally {
      try {
        await unlink(videoPath)
      } catch (error) {
        console.warn('Erro ao deletar vídeo temporário:', error)
      }
    }
  }

  /**
   * Extrai a duração do vídeo usando FFmpeg
   */
  private async extractDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (error, metadata) => {
        if (error) {
          reject(error)
          return
        }

        const duration = metadata.format.duration || 0
        resolve(duration)
      })
    })
  }
}
