import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { to, subject, message } = await req.json();

        if (!to || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate environment variables
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
            console.error("Missing SMTP credentials in environment variables.");
            return NextResponse.json({ error: 'Server is not configured to send emails' }, { status: 500 });
        }

        // Create the Nodemailer transport
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, // True for 465, false for other ports (like 587)
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        // Send the email
        const info = await transporter.sendMail({
            from: `"Responses Dashboard" <${SMTP_USER}>`, 
            to: to, // Recipient
            subject: subject,
            text: message, // Plain text body
            // html: `<p>${message.replace(/\\n/g, '<br/>')}</p>`, // Optional HTML body
        });

        console.log("Message sent: %s", info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId }, { status: 200 });

    } catch (error) {
        console.error("Error sending email:", error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
