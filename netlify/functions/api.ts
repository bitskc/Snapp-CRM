import { neon } from '@neondatabase/serverless';
import { getDatabase } from '@netlify/database';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const sendSlackWebhook = async (webhookUrl: string, payload: any) => {
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) return;
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        console.error('Slack Webhook delivery error:', err);
    }
};

const getSql = () => {
    // In modern Netlify Functions (default export), Netlify auto-populates the
    // runtime with the read-WRITE connection string; getDatabase() resolves it.
    // Fall back to explicit env vars for local dev / lambda-compat contexts.
    try {
        return neon(getDatabase().connectionString);
    } catch {
        const conn =
            process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
            process.env.NETLIFY_DATABASE_URL ||
            process.env.NETLIFY_DB_URL ||
            process.env.DATABASE_URL;
        if (!conn) {
            throw new Error('No database connection string available in the function runtime.');
        }
        return neon(conn);
    }
};

const getUserId = (event: any, context: any): string | null => {
    if (context?.clientContext?.user?.sub) {
        return context.clientContext.user.sub;
    }
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
            return payload.sub || payload.id || null;
        } catch {
            return null;
        }
    }
    return null;
};

const handleEvent = async (event: any, context: any) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    const rawPath = event.path.replace(/\/\.netlify\/functions\/api\/?/, '');

    // Unauthenticated DB health check: reports read/write capability only.
    // Never returns secrets or user data.
    if (rawPath.replace(/\/$/, '') === 'health/db') {
        const result: Record<string, unknown> = { canRead: false, canWrite: false };
        try {
            const sql = getSql();
            await sql`SELECT 1`;
            result.canRead = true;
            await sql`CREATE TABLE IF NOT EXISTS public._healthcheck (id INT PRIMARY KEY, ts TIMESTAMPTZ)`;
            await sql`INSERT INTO public._healthcheck (id, ts) VALUES (1, NOW()) ON CONFLICT (id) DO UPDATE SET ts = NOW()`;
            result.canWrite = true;
        } catch (err: unknown) {
            result.error = err instanceof Error ? err.message : String(err);
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
    }

    const userId = getUserId(event, context);
    if (!userId) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Unauthorized: missing or invalid session' }),
        };
    }

    const sql = getSql();
    const path = event.path.replace(/\/\.netlify\/functions\/api\/?/, '');
    const segments = path.split('/').filter(Boolean);
    const method = event.httpMethod;

    try {
        // POST /slack/test
        if (segments[0] === 'slack' && segments[1] === 'test' && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const webhookUrl = body.webhookUrl;
            if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Invalid Slack Webhook URL. Must start with https://hooks.slack.com/' }),
                };
            }
            await sendSlackWebhook(webhookUrl, {
                text: '⚡ *Snapp CRM — Slack Integration Test*\nSlack notification connection verified successfully!'
            });
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
        }

        // GET /settings
        if (segments[0] === 'settings' && method === 'GET') {
            const res = await sql`SELECT * FROM settings WHERE user_id = ${userId} LIMIT 1`;
            if (res.length === 0) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        companyName: 'ServiceSnapp',
                        companyDescription: 'The premier mobile Field Service Management (FSM) application.',
                        aboutMe: 'Professional and direct sales approach.',
                        statuses: [
                            { id: 'COLD', label: 'Cold', color: 'blue', order: 0 },
                            { id: 'WARM', label: 'Warm', color: 'yellow', order: 1 },
                            { id: 'LIVE', label: 'Live', color: 'green', order: 2 },
                            { id: 'DEAD', label: 'Dead', color: 'red', order: 3 },
                        ],
                    }),
                };
            }
            const s = res[0];
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    id: s.id,
                    user_id: s.user_id,
                    companyName: s.company_name || 'ServiceSnapp',
                    companyDescription: s.company_description || '',
                    aboutMe: s.about_me || '',
                    statuses: s.statuses,
                    sheetUrl: s.sheet_url || '',
                    slackWebhookUrl: s.slack_webhook_url || '',
                    slackNotifyNewLead: s.slack_notify_new_lead ?? true,
                    slackNotifyNewNote: s.slack_notify_new_note ?? true,
                    geminiApiKey: s.gemini_api_key || '',
                    openaiApiKey: s.openai_api_key || '',
                    anthropicApiKey: s.anthropic_api_key || '',
                }),
            };
        }

        // POST /settings
        if (segments[0] === 'settings' && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const res = await sql`
                INSERT INTO settings (user_id, company_name, company_description, about_me, statuses, sheet_url, slack_webhook_url, slack_notify_new_lead, slack_notify_new_note, gemini_api_key, openai_api_key, anthropic_api_key, updated_at)
                VALUES (${userId}, ${body.companyName || 'ServiceSnapp'}, ${body.companyDescription || ''}, ${body.aboutMe || ''}, ${JSON.stringify(body.statuses)}::jsonb, ${body.sheetUrl || ''}, ${body.slackWebhookUrl || null}, ${body.slackNotifyNewLead ?? true}, ${body.slackNotifyNewNote ?? true}, ${body.geminiApiKey || null}, ${body.openaiApiKey || null}, ${body.anthropicApiKey || null}, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                company_description = EXCLUDED.company_description,
                about_me = EXCLUDED.about_me,
                statuses = EXCLUDED.statuses,
                sheet_url = EXCLUDED.sheet_url,
                slack_webhook_url = EXCLUDED.slack_webhook_url,
                slack_notify_new_lead = EXCLUDED.slack_notify_new_lead,
                slack_notify_new_note = EXCLUDED.slack_notify_new_note,
                gemini_api_key = EXCLUDED.gemini_api_key,
                openai_api_key = EXCLUDED.openai_api_key,
                anthropic_api_key = EXCLUDED.anthropic_api_key,
                updated_at = NOW()
                RETURNING *
            `;
            const s = res[0];
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    id: s.id,
                    user_id: s.user_id,
                    companyName: s.company_name,
                    companyDescription: s.company_description,
                    aboutMe: s.about_me,
                    statuses: s.statuses,
                    sheetUrl: s.sheet_url,
                    slackWebhookUrl: s.slack_webhook_url,
                    slackNotifyNewLead: s.slack_notify_new_lead,
                    slackNotifyNewNote: s.slack_notify_new_note,
                    geminiApiKey: s.gemini_api_key,
                    openaiApiKey: s.openai_api_key,
                    anthropicApiKey: s.anthropic_api_key,
                }),
            };
        }
        // GET /leads
        if (segments[0] === 'leads' && segments.length === 1 && method === 'GET') {
            const params = event.queryStringParameters || {};
            const page = parseInt(params.page || '0', 10);
            const pageSize = parseInt(params.pageSize || '50', 10);
            const offset = page * pageSize;

            const countRes = await sql`SELECT COUNT(*) as total FROM leads WHERE user_id = ${userId}`;
            const totalCount = parseInt(countRes[0]?.total || '0', 10);

            const leadsData = await sql`
                SELECT * FROM leads 
                WHERE user_id = ${userId} 
                ORDER BY created_at DESC 
                LIMIT ${pageSize} OFFSET ${offset}
            `;

            const leadIds = leadsData.map((l: any) => l.id);
            let notesData: any[] = [];
            let leadProductsData: any[] = [];

            if (leadIds.length > 0) {
                notesData = await sql`SELECT * FROM notes WHERE lead_id = ANY(${leadIds})`;
                leadProductsData = await sql`SELECT * FROM lead_products WHERE lead_id = ANY(${leadIds})`;
            }

            const leads = leadsData.map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                companyName: row.company_name,
                contactName: row.contact_name,
                email: row.email,
                phone: row.phone,
                website: row.website,
                location: row.location,
                latitude: row.latitude,
                longitude: row.longitude,
                status: row.status,
                description: row.description,
                source: row.source,
                createdAt: row.created_at,
                aiAnalysis: row.ai_analysis,
                matchScore: row.match_score,
                matchReason: row.match_reason,
                notes: notesData
                    .filter((n: any) => n.lead_id === row.id)
                    .map((n: any) => ({
                        id: n.id,
                        content: n.content,
                        createdAt: n.created_at,
                        author: 'User',
                        activityDate: n.activity_date ?? undefined,
                        activityType: n.activity_type ?? undefined,
                    })),
                productIds: leadProductsData
                    .filter((lp: any) => lp.lead_id === row.id)
                    .map((lp: any) => lp.product_id),
            }));

            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ leads, totalCount }) };
        }

        // POST /leads/bulk
        if (segments[0] === 'leads' && segments[1] === 'bulk' && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const leads: any[] = body.leads || [];

            for (const lead of leads) {
                const leadId = lead.id && lead.id.length > 10 ? lead.id : crypto.randomUUID();
                await sql`
                    INSERT INTO leads (id, user_id, company_name, contact_name, email, phone, website, location, latitude, longitude, status, description, source, ai_analysis, match_score, match_reason, created_at, updated_at)
                    VALUES (${leadId}, ${userId}, ${lead.companyName}, ${lead.contactName || null}, ${lead.email || null}, ${lead.phone || null}, ${lead.website || null}, ${lead.location || null}, ${lead.latitude ?? null}, ${lead.longitude ?? null}, ${lead.status || 'COLD'}, ${lead.description || null}, ${lead.source || 'MANUAL'}, ${lead.aiAnalysis ? JSON.stringify(lead.aiAnalysis) : null}::jsonb, ${lead.matchScore ?? null}, ${lead.matchReason || null}, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    contact_name = EXCLUDED.contact_name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    website = EXCLUDED.website,
                    location = EXCLUDED.location,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    status = EXCLUDED.status,
                    description = EXCLUDED.description,
                    updated_at = NOW()
                `;
            }
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
        }

        // POST /leads
        if (segments[0] === 'leads' && segments.length === 1 && method === 'POST') {
            const lead = JSON.parse(event.body || '{}');
            const leadId = lead.id && lead.id.length > 10 ? lead.id : crypto.randomUUID();

            await sql`
                INSERT INTO leads (id, user_id, company_name, contact_name, email, phone, website, location, latitude, longitude, status, description, source, ai_analysis, match_score, match_reason, created_at, updated_at)
                VALUES (${leadId}, ${userId}, ${lead.companyName}, ${lead.contactName || null}, ${lead.email || null}, ${lead.phone || null}, ${lead.website || null}, ${lead.location || null}, ${lead.latitude ?? null}, ${lead.longitude ?? null}, ${lead.status || 'COLD'}, ${lead.description || null}, ${lead.source || 'MANUAL'}, ${lead.aiAnalysis ? JSON.stringify(lead.aiAnalysis) : null}::jsonb, ${lead.matchScore ?? null}, ${lead.matchReason || null}, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                contact_name = EXCLUDED.contact_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                website = EXCLUDED.website,
                location = EXCLUDED.location,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                status = EXCLUDED.status,
                description = EXCLUDED.description,
                updated_at = NOW()
            `;

            await sql`DELETE FROM lead_products WHERE lead_id = ${leadId}`;
            if (lead.productIds && lead.productIds.length > 0) {
                for (const pid of lead.productIds) {
                    await sql`INSERT INTO lead_products (lead_id, product_id) VALUES (${leadId}, ${pid}) ON CONFLICT DO NOTHING`;
                }
            }

            try {
                const settingsRes = await sql`SELECT slack_webhook_url, slack_notify_new_lead FROM settings WHERE user_id = ${userId} LIMIT 1`;
                if (settingsRes[0]?.slack_webhook_url && settingsRes[0]?.slack_notify_new_lead) {
                    sendSlackWebhook(settingsRes[0].slack_webhook_url, {
                        text: `🎯 *New Lead in Snapp CRM*\n• *Company:* ${lead.companyName}\n• *Contact:* ${lead.contactName || 'N/A'}\n• *Email:* ${lead.email || 'N/A'}\n• *Phone:* ${lead.phone || 'N/A'}\n• *Location:* ${lead.location || 'N/A'}\n• *Status:* ${lead.status || 'COLD'}`
                    });
                }
            } catch (err) {
                console.error("Failed to dispatch Slack lead alert", err);
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ ...lead, id: leadId, user_id: userId }),
            };
        }

        // DELETE /leads/:id
        if (segments[0] === 'leads' && segments.length === 2 && method === 'DELETE') {
            const leadId = segments[1];
            await sql`DELETE FROM leads WHERE id = ${leadId} AND user_id = ${userId}`;
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
        }

        // POST /leads/:id/notes
        if (segments[0] === 'leads' && segments[2] === 'notes' && method === 'POST') {
            const leadId = segments[1];
            const body = JSON.parse(event.body || '{}');
            const noteId = crypto.randomUUID();

            const res = await sql`
                INSERT INTO notes (id, lead_id, user_id, content, type, activity_date, activity_type, created_at)
                VALUES (${noteId}, ${leadId}, ${userId}, ${body.content}, 'MANUAL', ${body.activityDate || null}, ${body.activityType || null}, NOW())
                RETURNING *;
            `;
            const n = res[0];

            try {
                const settingsRes = await sql`SELECT slack_webhook_url, slack_notify_new_note FROM settings WHERE user_id = ${userId} LIMIT 1`;
                const leadRes = await sql`SELECT company_name FROM leads WHERE id = ${leadId} LIMIT 1`;
                if (settingsRes[0]?.slack_webhook_url && settingsRes[0]?.slack_notify_new_note) {
                    sendSlackWebhook(settingsRes[0].slack_webhook_url, {
                        text: `💬 *New Activity Note — ${leadRes[0]?.company_name || 'Lead'}*\n• *Type:* ${body.activityType || 'MANUAL'}\n• *Date:* ${body.activityDate || 'Today'}\n• *Note:* ${body.content}`
                    });
                }
            } catch (err) {
                console.error("Failed to dispatch Slack note alert", err);
            }
            return {
                headers: corsHeaders,
                body: JSON.stringify({
                    id: n.id,
                    content: n.content,
                    createdAt: n.created_at,
                    author: 'User',
                    activityDate: n.activity_date ?? undefined,
                    activityType: n.activity_type ?? undefined,
                }),
            };
        }

        // GET /settings
        if (segments[0] === 'settings' && method === 'GET') {
            const res = await sql`SELECT * FROM settings WHERE user_id = ${userId} LIMIT 1`;
            if (res.length === 0) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        companyName: 'ServiceSnapp',
                        companyDescription: 'The premier mobile Field Service Management (FSM) application.',
                        aboutMe: 'Professional and direct sales approach.',
                        statuses: [
                            { id: 'COLD', label: 'Cold', color: 'blue', order: 0 },
                            { id: 'WARM', label: 'Warm', color: 'yellow', order: 1 },
                            { id: 'LIVE', label: 'Live', color: 'green', order: 2 },
                            { id: 'DEAD', label: 'Dead', color: 'red', order: 3 },
                        ],
                    }),
                };
            }
            const s = res[0];
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    id: s.id,
                    user_id: s.user_id,
                    companyName: s.company_name || 'ServiceSnapp',
                    companyDescription: s.company_description || '',
                    aboutMe: s.about_me || '',
                    statuses: s.statuses,
                    sheetUrl: s.sheet_url || '',
                }),
            };
        }

        // POST /settings
        if (segments[0] === 'settings' && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const res = await sql`
                INSERT INTO settings (user_id, company_name, company_description, about_me, statuses, sheet_url, updated_at)
                VALUES (${userId}, ${body.companyName || 'ServiceSnapp'}, ${body.companyDescription || ''}, ${body.aboutMe || ''}, ${JSON.stringify(body.statuses)}, ${body.sheetUrl || ''}, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                company_description = EXCLUDED.company_description,
                about_me = EXCLUDED.about_me,
                statuses = EXCLUDED.statuses,
                sheet_url = EXCLUDED.sheet_url,
                updated_at = NOW()
                RETURNING *
            `;
            const s = res[0];
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    id: s.id,
                    user_id: s.user_id,
                    companyName: s.company_name,
                    companyDescription: s.company_description,
                    aboutMe: s.about_me,
                    statuses: s.statuses,
                    sheetUrl: s.sheet_url,
                }),
            };
        }

        // GET /products
        if (segments[0] === 'products' && segments.length === 1 && method === 'GET') {
            const res = await sql`SELECT * FROM products WHERE user_id = ${userId} ORDER BY name`;
            const products = res.map((p: any) => ({
                id: p.id,
                user_id: p.user_id,
                name: p.name,
                description: p.description,
            }));
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(products) };
        }

        // POST /products
        if (segments[0] === 'products' && segments.length === 1 && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const productId = body.id && body.id.length > 10 ? body.id : crypto.randomUUID();
            const res = await sql`
                INSERT INTO products (id, user_id, name, description, updated_at)
                VALUES (${productId}, ${userId}, ${body.name}, ${body.description || ''}, NOW())
                ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                updated_at = NOW()
                RETURNING *
            `;
            const p = res[0];
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ id: p.id, user_id: p.user_id, name: p.name, description: p.description }) };
        }

        // DELETE /products/:id
        if (segments[0] === 'products' && segments.length === 2 && method === 'DELETE') {
            const productId = segments[1];
            await sql`DELETE FROM products WHERE id = ${productId} AND user_id = ${userId}`;
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
        }

        // Growth Lab Endpoints
        if (segments[0] === 'growth') {
            if (segments[1] === 'settings') {
                if (method === 'GET') {
                    const res = await sql`SELECT * FROM growth_settings WHERE user_id = ${userId} LIMIT 1`;
                    if (res.length === 0) return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(null) };
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            currentCampaignTheme: res[0].current_campaign_theme,
                            themeGoal: res[0].theme_goal,
                            updatedAt: res[0].updated_at,
                        }),
                    };
                }
                if (method === 'POST') {
                    const body = JSON.parse(event.body || '{}');
                    await sql`
                        INSERT INTO growth_settings (user_id, current_campaign_theme, theme_goal, updated_at)
                        VALUES (${userId}, ${body.currentCampaignTheme || null}, ${body.themeGoal || null}, NOW())
                        ON CONFLICT (user_id) DO UPDATE SET
                        current_campaign_theme = EXCLUDED.current_campaign_theme,
                        theme_goal = EXCLUDED.theme_goal,
                        updated_at = NOW()
                    `;
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
                }
            }

            if (segments[1] === 'concepts') {
                if (method === 'GET') {
                    const statusFilter = event.queryStringParameters?.status;
                    let res;
                    if (statusFilter) {
                        res = await sql`SELECT * FROM growth_concepts WHERE user_id = ${userId} AND status = ${statusFilter} ORDER BY created_at DESC`;
                    } else {
                        res = await sql`SELECT * FROM growth_concepts WHERE user_id = ${userId} ORDER BY created_at DESC`;
                    }
                    const concepts = res.map((c: any) => ({
                        id: c.id,
                        topic: c.topic,
                        themeSnapshot: c.theme_snapshot,
                        status: c.status,
                        createdAt: c.created_at,
                    }));
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(concepts) };
                }
                if (method === 'POST') {
                    const body = JSON.parse(event.body || '{}');
                    const conceptId = body.id || crypto.randomUUID();
                    const res = await sql`
                        INSERT INTO growth_concepts (id, user_id, topic, theme_snapshot, status, created_at)
                        VALUES (${conceptId}, ${userId}, ${body.topic}, ${body.themeSnapshot || null}, ${body.status || 'RAW'}, ${body.createdAt || new Date().toISOString()})
                        ON CONFLICT (id) DO UPDATE SET
                        topic = EXCLUDED.topic,
                        theme_snapshot = EXCLUDED.theme_snapshot,
                        status = EXCLUDED.status
                        RETURNING *
                    `;
                    const c = res[0];
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            id: c.id,
                            topic: c.topic,
                            themeSnapshot: c.theme_snapshot,
                            status: c.status,
                            createdAt: c.created_at,
                        }),
                    };
                }
            }

            if (segments[1] === 'posts') {
                if (method === 'GET') {
                    const conceptId = event.queryStringParameters?.conceptId;
                    const res = await sql`SELECT * FROM growth_posts WHERE concept_id = ${conceptId}`;
                    const posts = res.map((p: any) => ({
                        id: p.id,
                        conceptId: p.concept_id,
                        platform: p.platform,
                        content: p.content,
                        status: p.status,
                        createdAt: p.created_at,
                    }));
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(posts) };
                }
                if (method === 'POST') {
                    const body = JSON.parse(event.body || '{}');
                    const postId = body.id || crypto.randomUUID();
                    const res = await sql`
                        INSERT INTO growth_posts (id, concept_id, platform, content, status, created_at)
                        VALUES (${postId}, ${body.conceptId}, ${body.platform}, ${body.content}, ${body.status || 'DRAFT'}, ${body.createdAt || new Date().toISOString()})
                        ON CONFLICT (id) DO UPDATE SET
                        platform = EXCLUDED.platform,
                        content = EXCLUDED.content,
                        status = EXCLUDED.status
                        RETURNING *
                    `;
                    const p = res[0];
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            id: p.id,
                            conceptId: p.concept_id,
                            platform: p.platform,
                            content: p.content,
                            status: p.status,
                            createdAt: p.created_at,
                        }),
                    };
                }
            }

            if (segments[1] === 'opportunities') {
                if (method === 'GET') {
                    const res = await sql`SELECT * FROM engagement_opportunities WHERE user_id = ${userId} ORDER BY created_at DESC`;
                    const opps = res.map((o: any) => ({
                        id: o.id,
                        queryUrl: o.query_url,
                        themeFocus: o.theme_focus,
                        suggestedReply: o.suggested_reply,
                        status: o.status,
                        createdAt: o.created_at,
                    }));
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(opps) };
                }
                if (method === 'POST') {
                    const body = JSON.parse(event.body || '{}');
                    const oppId = body.id || crypto.randomUUID();
                    const res = await sql`
                        INSERT INTO engagement_opportunities (id, user_id, query_url, theme_focus, suggested_reply, status, created_at)
                        VALUES (${oppId}, ${userId}, ${body.queryUrl}, ${body.themeFocus || null}, ${body.suggestedReply || null}, ${body.status || 'NEW'}, ${body.createdAt || new Date().toISOString()})
                        ON CONFLICT (id) DO UPDATE SET
                        query_url = EXCLUDED.query_url,
                        theme_focus = EXCLUDED.theme_focus,
                        suggested_reply = EXCLUDED.suggested_reply,
                        status = EXCLUDED.status
                        RETURNING *
                    `;
                    const o = res[0];
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            id: o.id,
                            queryUrl: o.query_url,
                            themeFocus: o.theme_focus,
                            suggestedReply: o.suggested_reply,
                            status: o.status,
                            createdAt: o.created_at,
                        }),
                    };
                }
            }
        }

        return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: `Endpoint not found: ${path}` }) };
    } catch (err: any) {
        console.error('Database query error:', err);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message || 'Database error' }) };
    }
};

// Modern Netlify Function entrypoint (default export). Using this signature —
// instead of the legacy `export const handler` (Lambda compatibility mode) —
// is what makes Netlify auto-populate the runtime with the read-WRITE Netlify
// Database connection string. We adapt the Web Request into the internal
// event shape the handlers already expect.
export default async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const body = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();
    const event = {
        httpMethod: req.method,
        path: url.pathname,
        queryStringParameters: Object.fromEntries(url.searchParams.entries()),
        headers,
        body,
    };
    const result = await handleEvent(event, {});
    return new Response(result.body || '', {
        status: result.statusCode,
        headers: result.headers as Record<string, string>,
    });
};
