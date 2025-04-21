import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { calEventUid } = await request.json();
    
    // Get the API key from the request headers
    const headersList = headers();
    const apiKey = headersList.get('apikey');
    
    console.log('Received headers:', {
      hasApiKey: !!apiKey
    });

    if (!apiKey) {
      console.error('No API key provided in request headers');
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    if (!calEventUid) {
      console.error('No Cal.com event UID provided');
      return NextResponse.json(
        { error: 'Cal.com event UID is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to cancel Cal.com booking:', {
      calEventUid,
      hasApiKey: !!apiKey
    });

    // Cancel the booking in Cal.com using v1 API
    const response = await fetch(`https://api.cal.com/v1/bookings/${calEventUid}/cancel`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': apiKey  // Use apiKey header as expected by Cal.com
      }
    });

    const responseData = await response.json();
    console.log('Cal.com API response:', {
      status: response.status,
      data: responseData
    });

    if (!response.ok) {
      console.error('Cal.com API error:', responseData);
      return NextResponse.json(
        { error: responseData.message || 'Failed to cancel Cal.com booking' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling Cal.com booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel Cal.com booking' },
      { status: 500 }
    );
  }
} 