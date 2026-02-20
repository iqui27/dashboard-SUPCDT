import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { PasswordResetEmail } from '../emails/PasswordResetEmail.js';
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465;
const resendApiKey = process.env.RESEND_API_KEY;
const mailFrom = process.env.MAIL_FROM || `contato@iqui27.app`;
let transporter = null;
let resendClient = null;
async function ensureTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: smtpUser && smtpPass ? {
                user: smtpUser,
                pass: smtpPass
            } : undefined
        });
    }
    return transporter;
}
function ensureResend() {
    if (!resendClient) {
        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY is not configured');
        }
        resendClient = new Resend(resendApiKey);
    }
    return resendClient;
}
export async function sendEmail({ to, subject, html, text }) {
    if (resendApiKey) {
        try {
            const resend = ensureResend();
            await resend.emails.send({
                from: mailFrom,
                to,
                subject,
                html,
                text
            });
            return;
        }
        catch (error) {
            console.error('Failed to send email via Resend, falling back to SMTP if available:', error);
        }
    }
    if (!smtpHost) {
        console.warn('SMTP configuration not provided. Email will be logged instead of sent.');
        console.info(`[EMAIL MOCK] To: ${to}`);
        console.info(`[EMAIL MOCK] Subject: ${subject}`);
        console.info(`[EMAIL MOCK] Text: ${text ?? html}`);
        return;
    }
    const transporter = await ensureTransporter();
    await transporter.sendMail({
        from: mailFrom,
        to,
        subject,
        text,
        html
    });
}
export async function sendPasswordResetEmail({ to, username, resetLink }) {
    const subject = 'Recuperação de senha - SECTI Dashboard';
    const html = await render(React.createElement(PasswordResetEmail, {
        username,
        resetLink
    }));
    const text = `Olá, ${username},\n\n` +
        'Recebemos uma solicitação para redefinir a senha da sua conta no SECTI Dashboard.\n' +
        `Se você fez essa solicitação, utilize o link a seguir para redefinir sua senha: ${resetLink}\n\n` +
        'Se você não solicitou a redefinição, ignore este email. Este link expira em 1 hora.\n\n' +
        'Atenciosamente,\nEquipe SECTI';
    await sendEmail({ to, subject, html, text });
}
