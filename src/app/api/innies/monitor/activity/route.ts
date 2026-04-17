import {
  getInniesMonitorActivityFeed,
  InniesMonitorActivityError,
} from '../../../../../lib/inniesMonitor/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getInniesMonitorActivityFeed();
    return Response.json(payload, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof InniesMonitorActivityError) {
      return Response.json(
        {
          code: 'activity_error',
          message: error.message,
          details: error.details,
        },
        {
          status: error.status,
          headers: { 'cache-control': 'no-store' },
        },
      );
    }

    return Response.json(
      {
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Unexpected monitor activity failure',
      },
      {
        status: 500,
        headers: { 'cache-control': 'no-store' },
      },
    );
  }
}
