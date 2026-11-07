import nodemailer from 'nodemailer'
import { appUrl, mailConfig } from '../config.js'
import { logger } from './logger.js'

export const bandejaSalida = []

let transporte = null

function obtenerTransporte() {
  if (!transporte) {
    if (!mailConfig.host) {
      throw new Error('SMTP_HOST no está configurado')
    }
    transporte = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.port === 465,
      auth: mailConfig.user
        ? { user: mailConfig.user, pass: mailConfig.password }
        : undefined,
    })
  }
  return transporte
}

export async function enviarCorreo({ to, subject, text, html }) {
  if (mailConfig.transport === 'memory') {
    bandejaSalida.push({ to, subject, text, html, enviadoEn: new Date() })
    return
  }

  if (mailConfig.transport === 'console') {
    logger.info({ to, subject, texto: text }, 'Correo simulado (MAIL_TRANSPORT=console)')
    return
  }

  if (mailConfig.transport === 'smtp') {
    await obtenerTransporte().sendMail({
      from: mailConfig.from,
      to,
      subject,
      text,
      html,
    })
    return
  }

  throw new Error(`MAIL_TRANSPORT desconocido: ${mailConfig.transport}`)
}

export function limpiarBandeja() {
  bandejaSalida.length = 0
}

export function construirEnlaceRecuperacion(token) {
  const base = appUrl.replace(/\/$/, '')
  return `${base}/restablecer?token=${encodeURIComponent(token)}`
}
