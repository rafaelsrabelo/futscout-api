import { env } from '../env/index.js'

export class CloudflareR2Service {
  private accountId: string
  private apiToken: string
  private bucketName: string

  private publicBaseUrl: string

  constructor() {
    if (
      !env.CLOUDFLARE_ACCOUNT_ID ||
      !env.CLOUDFLARE_API_TOKEN ||
      !env.CLOUDFLARE_R2_BUCKET
    ) {
      throw new Error('Cloudflare R2 credentials not configured')
    }

    this.accountId = env.CLOUDFLARE_ACCOUNT_ID
    this.apiToken = env.CLOUDFLARE_API_TOKEN
    this.bucketName = env.CLOUDFLARE_R2_BUCKET

    // Se não tiver URL customizada, usa a URL pública padrão do bucket
    this.publicBaseUrl =
      env.CLOUDFLARE_R2_PUBLIC_URL ||
      `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com`
  }

  /**
   * Upload video to Cloudflare R2
   */
  async uploadVideo(
    buffer: Buffer,
    filename: string,
  ): Promise<{ url: string }> {
    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const uniqueFilename = `videos/${timestamp}_${filename}`

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}/objects/${uniqueFilename}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': this.getVideoContentType(filename),
          },
          body: buffer as unknown as BodyInit,
        },
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to upload video: ${error}`)
      }

      // URL público do arquivo no R2
      const publicUrl = `${this.publicBaseUrl}/${uniqueFilename}`

      return {
        url: publicUrl,
      }
    } catch (error) {
      console.error('Error uploading video to R2:', error)
      throw new Error(
        `Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Generate presigned URL for direct upload from frontend
   * This avoids loading the entire video in backend memory
   */
  async generatePresignedUploadUrl(
    filename: string,
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const timestamp = Date.now()
    const uniqueFilename = `videos/${timestamp}_${filename}`
    const key = uniqueFilename

    try {
      // R2 uses S3-compatible API, so we can use S3 presigned URL format
      // But R2 doesn't have native presigned URLs, so we'll use a workaround:
      // Generate a temporary upload token via API

      // Alternative: Use R2's direct upload with public access
      // For now, return the upload endpoint that frontend can use
      // with a temporary token

      const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}/objects/${key}`
      const publicUrl = `${this.publicBaseUrl}/${key}`

      return {
        uploadUrl,
        publicUrl,
        key,
      }
    } catch (error) {
      console.error('Error generating presigned URL:', error)
      throw new Error(
        `Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Delete video from R2
   */
  async deleteVideo(filename: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}/objects/${filename}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to delete video: ${await response.text()}`)
      }
    } catch (error) {
      console.error('Error deleting video from R2:', error)
      throw new Error(
        `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Upload image to Cloudflare R2
   */
  async uploadImage(
    buffer: Buffer,
    filename: string,
  ): Promise<{ url: string }> {
    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const uniqueFilename = `profile-photos/${timestamp}_${filename}`

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}/objects/${uniqueFilename}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': this.getImageContentType(filename),
          },
          body: buffer as unknown as BodyInit,
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Cloudflare R2 upload error:', errorText)
        throw new Error(`Failed to upload image: ${errorText}`)
      }

      // Construir URL pública
      const publicUrl = `${this.publicBaseUrl}/${uniqueFilename}`
      console.log('✅ Image uploaded successfully:', publicUrl)

      return { url: publicUrl }
    } catch (error) {
      console.error('Error uploading image to R2:', error)
      throw new Error(
        `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Get content type for image files
   */
  private getImageContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
    }

    return mimeTypes[ext || ''] || 'image/jpeg'
  }

  /**
   * Get content type for video files
   */
  private getVideoContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()

    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
      '3gp': 'video/3gpp',
      m4v: 'video/x-m4v',
    }

    return mimeTypes[ext || ''] || 'video/mp4'
  }

  /**
   * Upload thumbnail to Cloudflare R2
   */
  async uploadThumbnail(
    buffer: Buffer,
    originalVideoFilename: string,
  ): Promise<{ url: string }> {
    // Gerar nome único para o thumbnail baseado no vídeo
    const timestamp = Date.now()
    const baseFilename = originalVideoFilename.replace(/\.[^/.]+$/, '') // Remove extensão
    const uniqueFilename = `thumbnails/${timestamp}_${baseFilename}.jpg`

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}/objects/${uniqueFilename}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'image/jpeg',
          },
          body: buffer as unknown as BodyInit,
        },
      )

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      // Retornar URL pública do thumbnail
      return {
        url: `${this.publicBaseUrl}/${uniqueFilename}`,
      }
    } catch (error) {
      console.error('Error uploading thumbnail to R2:', error)
      throw new Error(
        `Failed to upload thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Validate video file
   */
  validateVideo(buffer: Buffer, filename: string): void {
    const maxSize = 100 * 1024 * 1024 // 100MB
    const allowedTypes = [
      'mp4',
      'avi',
      'mov',
      'wmv',
      'flv',
      'webm',
      'mkv',
      '3gp',
      'm4v',
    ]

    if (buffer.length > maxSize) {
      throw new Error(
        `Video file too large. Maximum size is ${maxSize / (1024 * 1024)}MB, but received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB.`,
      )
    }

    const ext = filename.toLowerCase().split('.').pop()
    if (!ext || !allowedTypes.includes(ext)) {
      throw new Error(
        'Invalid video type. Allowed: MP4, AVI, MOV, WMV, FLV, WebM, MKV, 3GP, M4V.',
      )
    }
  }
}
