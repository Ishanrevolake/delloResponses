import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

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
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

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
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
