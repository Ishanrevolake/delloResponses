require('dotenv').config({ path: '.env.local' });

async function testApiRoute() {
    console.log('Testing Next.js API Route for Form Ingestion...');

    try {
        const response = await fetch('http://localhost:3000/api/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                website_id: '2c6f4421-4634-42d1-8f32-965f5233f239', // User provided UUID
                data: {
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    message: 'Testing the API route directly!'
                }
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ API Route Test Succeeded!');
            console.log('Result:', result);
        } else {
            console.error('❌ API Route Test Failed:', result);
        }
    } catch (err) {
        console.error('Network Error during API test. Ensure Next.js is running (npm run dev).', err.message);
    }
}

testApiRoute();
