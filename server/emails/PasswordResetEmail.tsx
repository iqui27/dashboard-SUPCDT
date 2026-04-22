import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components';
import * as React from 'react';

export interface PasswordResetEmailProps {
  username: string;
  resetLink: string;
}

const primaryColor = '#285EA4';
const backgroundColor = '#F5F7FB';
const textColor = '#1F2933';
const mutedColor = '#6B7280';

export function PasswordResetEmail({ username, resetLink }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Redefina sua senha e continue acompanhando os projetos no SECTI Dashboard</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerSectionStyle}>
            <Text style={titleStyle}>SECTI Dashboard</Text>
            <Text style={subtitleStyle}>Solicitação de redefinição de senha</Text>
          </Section>

          <Section style={contentSectionStyle}>
            <Text style={greetingStyle}>Olá, {username}!</Text>
            <Text style={textStyle}>
              Recebemos uma solicitação para redefinir a senha da sua conta no SECTI Dashboard. Caso tenha sido você,
              utilize o botão abaixo para criar uma nova senha.
            </Text>

            <Section style={highlightBoxStyle}>
              <Text style={highlightLabelStyle}>Nome de usuário</Text>
              <Text style={highlightValueStyle}>{username}</Text>
            </Section>

            <Button style={buttonStyle} href={resetLink}>
              Redefinir senha agora
            </Button>

            <Text style={textStyle}>
              Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
            </Text>
            <Text style={linkStyle}>{resetLink}</Text>

            <Text style={mutedTextStyle}>Este link é válido por 1 hora a partir do recebimento deste e-mail.</Text>
          </Section>

          <Hr style={dividerStyle} />

          <Section style={footerSectionStyle}>
            <Text style={footerTextStyle}>
              Caso não tenha solicitado a redefinição de senha, nenhuma ação é necessária. Sua senha permanecerá a mesma.
            </Text>
            <Text style={footerSignatureStyle}>Equipe SECTI • Secretaria de Ciência, Tecnologia e Inovação</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor,
  padding: '32px 16px',
  fontFamily: 'Inter, Arial, sans-serif'
};

const containerStyle: React.CSSProperties = {
  margin: '0 auto',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  boxShadow: '0 12px 32px rgba(40, 94, 164, 0.12)',
  maxWidth: '560px',
  padding: '40px 36px'
};

const headerSectionStyle: React.CSSProperties = {
  textAlign: 'center'
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: primaryColor,
  margin: 0,
  letterSpacing: '0.4px',
  textTransform: 'uppercase'
};

const subtitleStyle: React.CSSProperties = {
  marginTop: '8px',
  color: mutedColor,
  fontSize: '14px',
  letterSpacing: '0.2px'
};

const contentSectionStyle: React.CSSProperties = {
  marginTop: '28px'
};

const greetingStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: textColor,
  marginBottom: '12px'
};

const textStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: textColor,
  marginBottom: '16px'
};

const highlightBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(40, 94, 164, 0.08)',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '28px'
};

const highlightLabelStyle: React.CSSProperties = {
  textTransform: 'uppercase',
  fontSize: '12px',
  letterSpacing: '1.2px',
  color: mutedColor,
  marginBottom: '4px'
};

const highlightValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: primaryColor,
  margin: 0
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: primaryColor,
  color: '#FFFFFF',
  padding: '14px 32px',
  borderRadius: '999px',
  fontWeight: 600,
  textDecoration: 'none',
  marginBottom: '20px'
};

const linkStyle: React.CSSProperties = {
  wordBreak: 'break-all',
  fontSize: '14px',
  lineHeight: '22px',
  color: primaryColor,
  marginBottom: '20px'
};

const mutedTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: mutedColor,
  marginBottom: '24px'
};

const dividerStyle: React.CSSProperties = {
  borderColor: 'rgba(107, 114, 128, 0.16)',
  margin: '0'
};

const footerSectionStyle: React.CSSProperties = {
  marginTop: '24px'
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: mutedColor,
  lineHeight: '22px',
  marginBottom: '12px'
};

const footerSignatureStyle: React.CSSProperties = {
  fontSize: '12px',
  color: mutedColor,
  textTransform: 'uppercase',
  letterSpacing: '1.4px'
};

export default PasswordResetEmail;
