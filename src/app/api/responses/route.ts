import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint is used by external websites to submit form responses
export async function POST(request: Request) {
    try {
        // Basic CORS headers to allow requests from any origin (you can restrict this later)
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Parse the incoming request body
        const body = await request.json();

        // Minimal validation to ensure website_id is provided
        if (!body.website_id) {
            return NextResponse.json(
                { error: 'website_id is required' },
                { status: 400, headers }
            );
        }

        // Insert the submission into the Supabase database
        // Assuming a table structure based on standard form submissions
        const { data, error } = await supabase
            .from('submissions')
            .insert([
                {
                    website_id: body.website_id,
                    form_id: body.form_id || null, // Optional: if tracking specific forms
                    data: body.data || body,       // Store the entire payload or a specific 'data' object
                    // metadata, ip_address, etc. could also be extracted here
                }
            ])
            .select();

        if (error) {
            console.error('Error inserting form response:', error);
            return NextResponse.json(
                { error: 'Failed to save form response' },
                { status: 500, headers }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Response saved successfully', data: data?.[0] },
            { status: 201, headers }
        );
    } catch (error: any) {
        console.error('Error handling form response:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
