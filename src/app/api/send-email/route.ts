import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

type MailError = Error & {
    code?: string;
    responseCode?: number;
};

function getPublicMailError(error: MailError) {
    if (error.code === 'EAUTH' || error.responseCode === 535) {
        return {
            status: 503,
            message: 'The Graft Gym mailbox login was rejected. Update SMTP_USER and SMTP_PASS, then try again.',
        };
    }

    if (['ECONNECTION', 'ESOCKET', 'ETIMEDOUT'].includes(error.code || '')) {
        return {
            status: 503,
            message: 'Could not connect to the Graft Gym mail server. Check SMTP_HOST, SMTP_PORT, and SMTP_SECURE.',
        };
    }

    return { status: 500, message: 'Failed to send email' };
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        
        const to = formData.get('to') as string;
        const subject = formData.get('subject') as string;
        const message = formData.get('message') as string;
        const submissionId = formData.get('submissionId') as string;
        const attachment = formData.get('attachment') as File | null;

        if (!to || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate environment variables
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
            console.error("Missing SMTP credentials in environment variables.");
            return NextResponse.json({ error: 'Server is not configured to send emails' }, { status: 500 });
        }

        // Handle attachment up to 5MB
        const attachments = [];
        if (attachment) {
            if (attachment.size > 5 * 1024 * 1024) {
                 return NextResponse.json({ error: 'Attachment exceeds 5MB limit' }, { status: 400 });
            }
            const buffer = Buffer.from(await attachment.arrayBuffer());
            attachments.push({
                filename: attachment.name,
                content: buffer
            });
        }

        // Create the Nodemailer transport
        const smtpPort = Number(SMTP_PORT);
        if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
            return NextResponse.json({ error: 'SMTP_PORT is invalid' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST.trim(),
            port: smtpPort,
            secure: SMTP_SECURE ? SMTP_SECURE === 'true' : smtpPort === 465,
            auth: {
                user: SMTP_USER.trim(),
                pass: SMTP_PASS.trim(),
            },
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 30_000,
        });

        // Send the email
        const info = await transporter.sendMail({
            from: `"Graft Gym" <${SMTP_USER}>`, 
            to: to, // Recipient
            subject: subject,
            text: message, // Plain text body
            attachments: attachments.length > 0 ? attachments : undefined
        });

        // Track email dispatched in Supabase JSONB
        if (submissionId) {
             const supabase = await createClient();
             
             const { data: subData } = await supabase
                .from('submissions')
                .select('data')
                .eq('id', submissionId)
                .single();
                
             if (subData) {
                 const newData = { ...subData.data, email_sent: true };
                 const { error: updateError } = await supabase
                    .from('submissions')
                    .update({ data: newData })
                    .eq('id', submissionId);
                 
                 if (updateError) {
                     console.error("Failed to update email_sent status:", updateError);
                 }
             }
        }

        console.log("Message sent: %s", info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId }, { status: 200 });

    } catch (error) {
        console.error("Error sending email:", error);
        const publicError = getPublicMailError(error as MailError);
        return NextResponse.json({ error: publicError.message }, { status: publicError.status });
    }
}
