import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Button, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
const primaryColor = '#285EA4';
const backgroundColor = '#F5F7FB';
const textColor = '#1F2933';
const mutedColor = '#6B7280';
export function PasswordResetEmail({ username, resetLink }) {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Redefina sua senha e continue acompanhando os projetos no SECTI Dashboard" }), _jsx(Body, { style: bodyStyle, children: _jsxs(Container, { style: containerStyle, children: [_jsxs(Section, { style: headerSectionStyle, children: [_jsx(Text, { style: titleStyle, children: "SECTI Dashboard" }), _jsx(Text, { style: subtitleStyle, children: "Solicita\u00E7\u00E3o de redefini\u00E7\u00E3o de senha" })] }), _jsxs(Section, { style: contentSectionStyle, children: [_jsxs(Text, { style: greetingStyle, children: ["Ol\u00E1, ", username, "!"] }), _jsx(Text, { style: textStyle, children: "Recebemos uma solicita\u00E7\u00E3o para redefinir a senha da sua conta no SECTI Dashboard. Caso tenha sido voc\u00EA, utilize o bot\u00E3o abaixo para criar uma nova senha." }), _jsxs(Section, { style: highlightBoxStyle, children: [_jsx(Text, { style: highlightLabelStyle, children: "Nome de usu\u00E1rio" }), _jsx(Text, { style: highlightValueStyle, children: username })] }), _jsx(Button, { style: buttonStyle, href: resetLink, children: "Redefinir senha agora" }), _jsx(Text, { style: textStyle, children: "Se o bot\u00E3o n\u00E3o funcionar, copie e cole o link abaixo no seu navegador:" }), _jsx(Text, { style: linkStyle, children: resetLink }), _jsx(Text, { style: mutedTextStyle, children: "Este link \u00E9 v\u00E1lido por 1 hora a partir do recebimento deste e-mail." })] }), _jsx(Hr, { style: dividerStyle }), _jsxs(Section, { style: footerSectionStyle, children: [_jsx(Text, { style: footerTextStyle, children: "Caso n\u00E3o tenha solicitado a redefini\u00E7\u00E3o de senha, nenhuma a\u00E7\u00E3o \u00E9 necess\u00E1ria. Sua senha permanecer\u00E1 a mesma." }), _jsx(Text, { style: footerSignatureStyle, children: "Equipe SECTI \u2022 Secretaria de Ci\u00EAncia, Tecnologia e Inova\u00E7\u00E3o" })] })] }) })] }));
}
const bodyStyle = {
    backgroundColor,
    padding: '32px 16px',
    fontFamily: 'Inter, Arial, sans-serif'
};
const containerStyle = {
    margin: '0 auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 12px 32px rgba(40, 94, 164, 0.12)',
    maxWidth: '560px',
    padding: '40px 36px'
};
const headerSectionStyle = {
    textAlign: 'center'
};
const titleStyle = {
    fontSize: '22px',
    fontWeight: 700,
    color: primaryColor,
    margin: 0,
    letterSpacing: '0.4px',
    textTransform: 'uppercase'
};
const subtitleStyle = {
    marginTop: '8px',
    color: mutedColor,
    fontSize: '14px',
    letterSpacing: '0.2px'
};
const contentSectionStyle = {
    marginTop: '28px'
};
const greetingStyle = {
    fontSize: '18px',
    fontWeight: 600,
    color: textColor,
    marginBottom: '12px'
};
const textStyle = {
    fontSize: '15px',
    lineHeight: '24px',
    color: textColor,
    marginBottom: '16px'
};
const highlightBoxStyle = {
    backgroundColor: 'rgba(40, 94, 164, 0.08)',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '28px'
};
const highlightLabelStyle = {
    textTransform: 'uppercase',
    fontSize: '12px',
    letterSpacing: '1.2px',
    color: mutedColor,
    marginBottom: '4px'
};
const highlightValueStyle = {
    fontSize: '20px',
    fontWeight: 700,
    color: primaryColor,
    margin: 0
};
const buttonStyle = {
    display: 'inline-block',
    backgroundColor: primaryColor,
    color: '#FFFFFF',
    padding: '14px 32px',
    borderRadius: '999px',
    fontWeight: 600,
    textDecoration: 'none',
    marginBottom: '20px'
};
const linkStyle = {
    wordBreak: 'break-all',
    fontSize: '14px',
    lineHeight: '22px',
    color: primaryColor,
    marginBottom: '20px'
};
const mutedTextStyle = {
    fontSize: '13px',
    color: mutedColor,
    marginBottom: '24px'
};
const dividerStyle = {
    borderColor: 'rgba(107, 114, 128, 0.16)',
    margin: '0'
};
const footerSectionStyle = {
    marginTop: '24px'
};
const footerTextStyle = {
    fontSize: '13px',
    color: mutedColor,
    lineHeight: '22px',
    marginBottom: '12px'
};
const footerSignatureStyle = {
    fontSize: '12px',
    color: mutedColor,
    textTransform: 'uppercase',
    letterSpacing: '1.4px'
};
export default PasswordResetEmail;
