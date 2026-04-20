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
   * Upload video to Cloudflare R2 from file path (stream, não buffer!)
   */
  async uploadVideoFromFile(
    filePath: string,
    filename: string,
  ): Promise<{ url: string }> {
    const { createReadStream } = await import('node:fs')
    const stream = createReadStream(filePath)
    return this.uploadVideoFromStream(stream, filename)
  }

  /**
   * Upload video to Cloudflare R2 from stream (não carrega na memória)
   */
  async uploadVideoFromStream(
    stream: NodeJS.ReadableStream,
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
          body: stream as unknown as BodyInit,
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
   * Upload video to Cloudflare R2 (mantido para compatibilidade, mas usa buffer)
   * @deprecated Use uploadVideoFromStream ou uploadVideoFromFile para melhor performance
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
   * Uses AWS SDK S3-compatible API (R2 is S3-compatible)
   */
  async generatePresignedUploadUrl(
    filename: string,
    expiresIn = 3600, // 1 hour default
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const timestamp = Date.now()
    const uniqueFilename = `videos/${timestamp}_${filename}`
    const key = uniqueFilename

    try {
      // R2 uses S3-compatible API
      // We need AWS SDK to generate presigned URLs
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

      // Get R2 endpoint from environment or use default
      const { env } = await import('../env/index.js')

      // R2 precisa de credenciais S3-compatible específicas (não o API Token)
      if (
        !env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
        !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      ) {
        throw new Error(
          'R2 S3-compatible credentials not configured. Please set CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY. ' +
            'Get them from: Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token',
        )
      }

      const r2Endpoint =
        env.CLOUDFLARE_R2_ENDPOINT ||
        `https://${this.accountId}.r2.cloudflarestorage.com`

      // Create S3 client configured for R2
      const s3Client = new S3Client({
        region: 'auto', // R2 uses 'auto' region
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true, // R2 requires path-style URLs
      })

      // Create PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: this.getVideoContentType(filename),
        // Permitir CORS para upload direto do frontend
        Metadata: {
          'upload-source': 'direct-frontend',
        },
      })

      // Generate presigned URL (valid for expiresIn seconds)
      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn,
      })

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
  getVideoContentType(filename: string): string {
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

  /**
   * Baixa um vídeo do R2 usando a API S3 (mais confiável que URL pública)
   * Retorna um stream do vídeo
   */
  async downloadVideoStream(key: string): Promise<NodeJS.ReadableStream> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')

    if (
      !env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
      !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    ) {
      throw new Error('R2 credentials not configured')
    }

    const r2Endpoint =
      env.CLOUDFLARE_R2_ENDPOINT ||
      `https://${this.accountId}.r2.cloudflarestorage.com`

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      throw new Error('Response body is null')
    }

    // Converter ReadableStream do AWS SDK para Node.js Readable
    const { Readable } = await import('node:stream')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Readable.from(response.Body as unknown as NodeJS.ReadableStream)
  }

  /**
   * Extrai a key do R2 a partir de uma URL pública
   * Exemplo: https://pub-xxx.r2.dev/videos/file.mp4 -> videos/file.mp4
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      // Remover o primeiro / do pathname
      const key = urlObj.pathname.substring(1)
      return key || null
    } catch {
      return null
    }
  }
}
