import FormData from 'form-data'
import { env } from '../env/index.js'

interface CloudflareUploadResponse {
  success: boolean
  result?: {
    id: string
    filename: string
    uploaded: string
    requireSignedURLs: boolean
    variants: string[]
  }
  errors?: Array<{
    code: number
    message: string
  }>
}

interface CloudflareStreamUploadResponse {
  success: boolean
  result?: {
    uid: string
    thumbnail: string
    readyToStream: boolean
    status: {
      state: string
      pctComplete: string
      errorReasonCode: string
      errorReasonText: string
    }
    meta: {
      name: string
    }
    created: string
    modified: string
    size: number
    preview: string
    allowedOrigins: string[]
    requireSignedURLs: boolean
    uploaded: string
    uploadExpiry: string | null
    maxSizeBytes: number | null
    maxDurationSeconds: number | null
    duration: number
    input: {
      width: number
      height: number
    }
    playback: {
      hls: string
      dash: string
    }
    watermark?: {
      uid: string
    }
  }
  errors?: Array<{
    code: number
    message: string
  }>
}

export class CloudflareService {
  private baseUrl = 'https://api.cloudflare.com/client/v4'
  private accountId: string
  private apiToken: string
  private imagesHash: string | undefined

  constructor() {
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
      throw new Error('Cloudflare credentials not configured')
    }

    this.accountId = env.CLOUDFLARE_ACCOUNT_ID
    this.apiToken = env.CLOUDFLARE_API_TOKEN
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`

    const defaultHeaders = {
      Authorization: `Bearer ${this.apiToken}`,
    }

    return fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })
  }

  /**
   * Upload image to Cloudflare Images
   */
  async uploadImage(
    buffer: Buffer,
    filename: string,
    metadata?: Record<string, string>,
  ): Promise<{
    id: string
    url: string
    variants: {
      public: string
      thumbnail: string
      [key: string]: string
    }
  }> {
    const formData = new FormData()

    formData.append('file', buffer, {
      filename,
      contentType: this.getContentType(filename),
    })

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    // Auto-generate variants for different sizes
    formData.append('requireSignedURLs', 'false')

    const response = await this.makeRequest(
      `/accounts/${this.accountId}/images/v1`,
      {
        method: 'POST',
        body: formData as unknown as BodyInit,
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload image: ${error}`)
    }

    const result: CloudflareUploadResponse = await response.json()

    if (!result.success || !result.result) {
      throw new Error(
        `Image upload failed: ${result.errors?.map((e) => e.message).join(', ')}`,
      )
    }

    // Build variants URLs
    const baseUrl = this.imagesHash
      ? `https://imagedelivery.net/${this.imagesHash}`
      : `https://imagedelivery.net/${this.accountId}`

    return {
      id: result.result.id,
      url: `${baseUrl}/${result.result.id}/public`,
      variants: {
        public: `${baseUrl}/${result.result.id}/public`,
        thumbnail: `${baseUrl}/${result.result.id}/thumbnail`,
        avatar: `${baseUrl}/${result.result.id}/avatar`,
        small: `${baseUrl}/${result.result.id}/small`,
        medium: `${baseUrl}/${result.result.id}/medium`,
        large: `${baseUrl}/${result.result.id}/large`,
      },
    }
  }

  /**
   * Upload video to Cloudflare Stream
   */
  async uploadVideo(
    buffer: Buffer,
    filename: string,
    metadata?: Record<string, string>,
  ): Promise<{
    uid: string
    thumbnail: string
    playbackUrl: string
    embedUrl: string
    dashUrl: string
    hlsUrl: string
    status: string
    duration?: number
  }> {
    const formData = new FormData()

    formData.append('file', buffer, {
      filename,
      contentType: this.getContentType(filename),
    })

    if (metadata) {
      formData.append('meta', JSON.stringify(metadata))
    }

    // Configure upload settings
    formData.append('requireSignedURLs', 'false')
    formData.append('allowedOrigins', JSON.stringify(['*'])) // Adjust as needed

    const response = await this.makeRequest(
      `/accounts/${this.accountId}/stream`,
      {
        method: 'POST',
        body: formData as unknown as BodyInit,
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload video: ${error}`)
    }

    const result: CloudflareStreamUploadResponse = await response.json()

    if (!result.success || !result.result) {
      throw new Error(
        `Video upload failed: ${result.errors?.map((e) => e.message).join(', ')}`,
      )
    }

    return {
      uid: result.result.uid,
      thumbnail: result.result.thumbnail,
      playbackUrl: `https://customer-${this.accountId}.cloudflarestream.com/${result.result.uid}/manifest/video.m3u8`,
      embedUrl: `https://customer-${this.accountId}.cloudflarestream.com/${result.result.uid}/iframe`,
      dashUrl: result.result.playback.dash,
      hlsUrl: result.result.playback.hls,
      status: result.result.status.state,
      duration: result.result.duration,
    }
  }

  /**
   * Get video details from Cloudflare Stream
   */
  async getVideo(uid: string): Promise<{
    uid: string
    status: string
    thumbnail: string
    duration?: number
    playbackUrl: string
  }> {
    const response = await this.makeRequest(
      `/accounts/${this.accountId}/stream/${uid}`,
      {
        method: 'GET',
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to get video: ${await response.text()}`)
    }

    const result: CloudflareStreamUploadResponse = await response.json()

    if (!result.success || !result.result) {
      throw new Error('Failed to retrieve video information')
    }

    return {
      uid: result.result.uid,
      status: result.result.status.state,
      thumbnail: result.result.thumbnail,
      duration: result.result.duration,
      playbackUrl: result.result.playback.hls,
    }
  }

  /**
   * Delete image from Cloudflare Images
   */
  async deleteImage(imageId: string): Promise<void> {
    const response = await this.makeRequest(
      `/accounts/${this.accountId}/images/v1/${imageId}`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${await response.text()}`)
    }
  }

  /**
   * Delete video from Cloudflare Stream
   */
  async deleteVideo(uid: string): Promise<void> {
    const response = await this.makeRequest(
      `/accounts/${this.accountId}/stream/${uid}`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to delete video: ${await response.text()}`)
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',

      // Videos
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

    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  /**
   * Validate file size and type for images
   */
  validateImage(buffer: Buffer, filename: string): void {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']

    if (buffer.length > maxSize) {
      throw new Error('Image file too large. Maximum size is 10MB.')
    }

    const ext = filename.toLowerCase().split('.').pop()
    if (!ext || !allowedTypes.includes(ext)) {
      throw new Error('Invalid image type. Allowed: JPG, PNG, GIF, WebP.')
    }
  }

  /**
   * Validate file size and type for videos
   */
  validateVideo(buffer: Buffer, filename: string): void {
    const maxSize = 200 * 1024 * 1024 // 200MB
    const allowedTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']

    if (buffer.length > maxSize) {
      throw new Error('Video file too large. Maximum size is 200MB.')
    }

    const ext = filename.toLowerCase().split('.').pop()
    if (!ext || !allowedTypes.includes(ext)) {
      throw new Error(
        'Invalid video type. Allowed: MP4, AVI, MOV, WMV, FLV, WebM, MKV.',
      )
    }
  }
}
