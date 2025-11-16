import ffmpeg from 'fluent-ffmpeg'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export class VideoThumbnailService {
  /**
   * Gera um thumbnail de um vídeo a partir de um buffer
   * @param videoBuffer - Buffer do vídeo
   * @param timeInSeconds - Tempo em segundos para capturar o frame (padrão: 1 segundo)
   * @returns Buffer da imagem thumbnail (JPEG)
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
      // Limpar arquivos temporários
      try {
        await unlink(videoPath)
      } catch (error) {
        console.warn('Erro ao deletar vídeo temporário:', error)
      }

      try {
        await unlink(thumbnailPath)
      } catch (error) {
        console.warn('Erro ao deletar thumbnail temporário:', error)
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
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: outputPath.split('/').pop() || 'thumb.jpg',
          folder: outputPath.substring(0, outputPath.lastIndexOf('/')),
          size: '640x360', // Resolução do thumbnail (16:9)
        })
        .on('end', () => resolve())
        .on('error', (error) => reject(error))
    })
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
