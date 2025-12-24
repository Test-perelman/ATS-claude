'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<any>(null);

  const log = (msg: string) => {
    console.log(`[DEBUG] ${msg}`);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    (async () => {
      log('=== STARTING DEBUG SESSION ===');

      // 1. Check if we have a Supabase session
      log('1. Checking supabase.auth.getSession()');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        log(`   ❌ Error: ${sessionError.message}`);
      } else if (sessionData?.session) {
        log(`   ✅ Session found`);
        log(`   Access Token: ${sessionData.session.access_token.substring(0, 50)}...`);
        log(`   User: ${sessionData.session.user?.email}`);
        setSession(sessionData.session);
      } else {
        log(`   ❌ No session found`);
      }

      // 2. Check cookies
      log('2. Checking document.cookie');
      const allCookies = document.cookie;
      if (allCookies) {
        log(`   ✅ Cookies present: ${allCookies.substring(0, 100)}...`);
        setCookies(allCookies);
      } else {
        log(`   ❌ No cookies found`);
      }

      // 3. Test /api/auth/session (server reads cookies)
      log('3. Testing GET /api/auth/session (server-side auth)');
      try {
        log(`   Making request to /api/auth/session with cookies`);
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        log(`   Status: ${response.status}`);
        const data = await response.json();
        log(`   Response: ${JSON.stringify(data).substring(0, 150)}...`);
        setApiResponse(data);

        if (!response.ok) {
          log(`   ❌ Error: ${data.error}`);
        } else if (data.data?.user) {
          log(`   ✅ Server auth SUCCESS! User: ${data.data.user.user_id}`);
        } else {
          log(`   ⚠️ No user in response`);
        }
      } catch (err) {
        log(`   ❌ Fetch error: ${err instanceof Error ? err.message : String(err)}`);
      }

      // 4. Test API call
      log('4. Testing POST /api/candidates with logging');
      const testData = {
        firstName: 'Debug',
        lastName: 'Test',
        email: 'debug@test.com',
        currentTitle: 'Engineer'
      };

      try {
        log(`   Making request to /api/candidates`);
        const response = await fetch('/api/candidates', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData)
        });

        log(`   Status: ${response.status}`);
        const data = await response.json();
        log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);

        if (!response.ok) {
          log(`   ❌ Error: ${data.error}`);
        } else {
          log(`   ✅ Success!`);
        }
      } catch (err) {
        log(`   ❌ Fetch error: ${err instanceof Error ? err.message : String(err)}`);
      }

      // 4. Test with Bearer token
      if (session?.access_token) {
        log('4. Testing with Bearer token');
        try {
          log(`   Making request with Authorization header`);
          const response = await fetch('/api/candidates', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(testData)
          });

          log(`   Status: ${response.status}`);
          const data = await response.json();

          if (!response.ok) {
            log(`   ❌ Error: ${data.error}`);
          } else {
            log(`   ✅ Success!`);
          }
        } catch (err) {
          log(`   ❌ Fetch error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      log('=== DEBUG COMPLETE ===');
    })();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4' }}>
      <h1>Debug Console</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Session Info</h2>
        {session ? (
          <div>
            <p>✅ Authenticated as: {session.user?.email}</p>
            <p>Access Token: {session.access_token.substring(0, 50)}...</p>
          </div>
        ) : (
          <p>❌ No session</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Cookies</h2>
        <p style={{ wordBreak: 'break-all', background: '#2d2d2d', padding: '10px' }}>
          {cookies || '❌ No cookies'}
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Server Authentication Response</h2>
        {apiResponse ? (
          <div style={{ background: '#2d2d2d', padding: '10px', wordBreak: 'break-all' }}>
            {apiResponse.data?.user ? (
              <div style={{ color: '#4ec9b0' }}>
                <p>✅ <strong>Server-side auth is working!</strong></p>
                <p>User: {apiResponse.data.user.user_id}</p>
                <p>Email: {apiResponse.data.user.email}</p>
                <p>Team: {apiResponse.data.teamName || 'N/A'}</p>
                <p>Role: {apiResponse.data.userRole || 'N/A'}</p>
              </div>
            ) : (
              <div style={{ color: '#f48771' }}>
                <p>❌ Server auth failed or returned null</p>
                <p>{JSON.stringify(apiResponse, null, 2)}</p>
              </div>
            )}
          </div>
        ) : (
          <p>No response yet - check logs below</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Logs</h2>
        <div style={{ background: '#2d2d2d', padding: '10px', maxHeight: '400px', overflow: 'auto' }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '5px', whiteSpace: 'pre-wrap' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
