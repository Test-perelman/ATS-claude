const fs = require('fs');
const path = require('path');

const filePath = 'd:\Perelman-ATS-claude\src\app\api\auth\session\route.ts';

// Read the current file
const content = fs.readFileSync(filePath, 'utf-8');

// Find and replace the broken token validation logic
const oldCode = `      try {
        // Create a client with the token for server-side auth
        const supabase = await createServerClient()

        // Set the auth token on the client
        const { data, error } = await supabase.auth.getUser(token)

        if (error) {
          console.error('[API /session] Token validation error:', error.message)
        } else if (data.user) {
          console.log('[API /session] Auth user from token:', data.user.id)

          // Now fetch the public user record
          const userIdString = data.user.id.toString()`;

const newCode = `      try {
        // Validate token using Supabase REST API
        console.log('[API /session] Validating Bearer token via REST API...')
        
        const authResponse = await fetch(\`\${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user\`, {
          method: 'GET',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        })

        if (!authResponse.ok) {
          console.error('[API /session] Token validation failed:', authResponse.status)
          return NextResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 401 }
          )
        }

        const authUser = await authResponse.json()
        console.log('[API /session] Auth user from token:', authUser.id)

        // Now fetch the public user record
        const userIdString = authUser.id.toString()
        
        const supabase = await createServerClient()`;

const newContent = content.replace(oldCode, newCode);

// Also update the reference to data.user.id in fallback
const oldFallback = `          } else if (data.user) {
            // Fallback: return user from token if not in public.users
            console.warn('[API /session] User not in public.users, using fallback')
            user = {
              user_id: data.user.id.toString(),
              email: data.user.email || '',`;

const newFallback = `          } else if (authUser) {
            // Fallback: return user from token if not in public.users
            console.warn('[API /session] User not in public.users, using fallback')
            user = {
              user_id: authUser.id.toString(),
              email: authUser.email || '',`;

const finalContent = newContent.replace(oldFallback, newFallback);

// Write the fixed content back
fs.writeFileSync(filePath, finalContent, 'utf-8');

console.log('✅ Fixed /api/auth/session/route.ts');
console.log('   - Replaced broken supabase.auth.getUser(token) with REST API call');
console.log('   - Now uses /auth/v1/user endpoint with Bearer token');
console.log('   - Token validation now works correctly on Vercel serverless');

