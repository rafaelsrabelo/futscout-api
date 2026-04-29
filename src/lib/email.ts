import nodemailer from 'nodemailer'
import { env } from '@/env/index.js'

export interface SendEmailData {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    // Só inicializa o transporter se as configurações de email estão disponíveis
    if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM_EMAIL) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // true para 465, false para outras portas
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
    }
  }

  async sendEmail({ to, subject, html, text }: SendEmailData) {
    if (!this.transporter) {
      console.warn('Email transporter not configured. Skipping email send.')
      return null
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
      })

      return info
    } catch (error) {
      console.error('Error sending email:', error)
      throw new Error('Failed to send email')
    }
  }

  async sendVerificationEmail(email: string, code: string, userName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verificação de Email - FutScout</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .code {
            background-color: #e8f5e8;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2e7d32;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚽ FutScout</h1>
          <h2>Verificação de Email</h2>
        </div>
        
        <div class="content">
          <h3>Olá, ${userName}!</h3>
          
          <p>Obrigado por se cadastrar no FutScout! Para completar seu cadastro, utilize o código de verificação abaixo:</p>
          
          <div class="code">
            ${code}
          </div>
          
          <p><strong>Instruções:</strong></p>
          <ul>
            <li>Digite este código na tela de verificação</li>
            <li>O código é válido por 15 minutos</li>
            <li>Não compartilhe este código com ninguém</li>
          </ul>
          
          <p>Se você não solicitou este cadastro, pode ignorar este email.</p>
          
          <p>Bem-vindo ao futuro do scouting!</p>
          
          <p>Atenciosamente,<br>
          <strong>Equipe FutScout</strong></p>
        </div>
        
        <div class="footer">
          <p>Este é um email automático. Não responda a esta mensagem.</p>
        </div>
      </body>
      </html>
    `

    const text = `
      FutScout - Verificação de Email
      
      Olá, ${userName}!
      
      Seu código de verificação é: ${code}
      
      Este código é válido por 15 minutos.
      
      Se você não solicitou este cadastro, ignore este email.
      
      Equipe FutScout
    `

    return await this.sendEmail({
      to: email,
      subject: '🔐 Código de Verificação - FutScout',
      html,
      text,
    })
  }

  async sendPasswordRecoveryEmail(
    email: string,
    password: string,
    userName: string,
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Acesso ao FutScout</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .password {
            background-color: #e8f5e8;
            padding: 20px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #2e7d32;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚽ FutScout</h1>
          <h2>Acesso à sua conta</h2>
        </div>

        <div class="content">
          <h3>Olá, ${userName}!</h3>

          <p>Confirmamos seu cadastro existente no FutScout. Use a senha temporária abaixo para acessar sua conta:</p>

          <div class="password">
            ${password}
          </div>

          <p><strong>Como acessar:</strong></p>
          <ul>
            <li>Use o email <strong>${email}</strong> e a senha acima para fazer login</li>
            <li>Recomendamos alterar a senha após o primeiro acesso</li>
            <li>Não compartilhe esta senha com ninguém</li>
          </ul>

          <p>Se você não solicitou este acesso, entre em contato com o suporte imediatamente.</p>

          <p>Atenciosamente,<br>
          <strong>Equipe FutScout</strong></p>
        </div>

        <div class="footer">
          <p>Este é um email automático. Não responda a esta mensagem.</p>
        </div>
      </body>
      </html>
    `

    const text = `
      FutScout - Acesso à sua conta

      Olá, ${userName}!

      Confirmamos seu cadastro existente no FutScout.

      Email: ${email}
      Senha temporária: ${password}

      Recomendamos alterar a senha após o primeiro acesso.

      Se você não solicitou este acesso, entre em contato com o suporte.

      Equipe FutScout
    `

    return await this.sendEmail({
      to: email,
      subject: '🔐 Acesso à sua conta - FutScout',
      html,
      text,
    })
  }
}

export const emailService = new EmailService()
