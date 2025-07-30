import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const aircraftData = [
      { icao: "A319", iata: "319", name: "Airbus A319" },
      { icao: "A320", iata: "320", name: "Airbus A320" },
      { icao: "A321", iata: "321", name: "Airbus A321" },
      { icao: "A332", iata: "332", name: "Airbus A330-200" },
      { icao: "A333", iata: "333", name: "Airbus A330-300" },
      { icao: "A338", iata: "338", name: "Airbus A330-800neo" },
      { icao: "A339", iata: "339", name: "Airbus A330-900neo" },
      { icao: "A342", iata: "342", name: "Airbus A340-200" },
      { icao: "A343", iata: "343", name: "Airbus A340-300" },
      { icao: "A345", iata: "345", name: "Airbus A340-500" },
      { icao: "A346", iata: "346", name: "Airbus A340-600" },
      { icao: "A359", iata: "359", name: "Airbus A350-900" },
      { icao: "A35K", iata: "351", name: "Airbus A350-1000" },
      { icao: "A380", iata: "380", name: "Airbus A380-800" },
      { icao: "B712", iata: "717", name: "Boeing 717-200" },
      { icao: "B733", iata: "733", name: "Boeing 737-300" },
      { icao: "B734", iata: "734", name: "Boeing 737-400" },
      { icao: "B735", iata: "735", name: "Boeing 737-500" },
      { icao: "B736", iata: "736", name: "Boeing 737-600" },
      { icao: "B737", iata: "737", name: "Boeing 737-700" },
      { icao: "B738", iata: "738", name: "Boeing 737-800" },
      { icao: "B739", iata: "739", name: "Boeing 737-900" },
      { icao: "B38M", iata: "7M8", name: "Boeing 737 MAX 8" },
      { icao: "B39M", iata: "7M9", name: "Boeing 737 MAX 9" },
      { icao: "B3XM", iata: "7MX", name: "Boeing 737 MAX 10" },
      { icao: "B744", iata: "744", name: "Boeing 747-400" },
      { icao: "B748", iata: "748", name: "Boeing 747-8" },
      { icao: "B752", iata: "752", name: "Boeing 757-200" },
      { icao: "B753", iata: "753", name: "Boeing 757-300" },
      { icao: "B762", iata: "762", name: "Boeing 767-200" },
      { icao: "B763", iata: "763", name: "Boeing 767-300" },
      { icao: "B764", iata: "764", name: "Boeing 767-400" },
      { icao: "B772", iata: "772", name: "Boeing 777-200" },
      { icao: "B773", iata: "773", name: "Boeing 777-300" },
      { icao: "B77L", iata: "77L", name: "Boeing 777-200LR" },
      { icao: "B77W", iata: "77W", name: "Boeing 777-300ER" },
      { icao: "B78X", iata: "788", name: "Boeing 787-8" },
      { icao: "B789", iata: "789", name: "Boeing 787-9" },
      { icao: "B78J", iata: "781", name: "Boeing 787-10" },
      { icao: "Other", iata: "Other", name: "Other"}
    ];
    
    const aircraftList = aircraftData.map((aircraft) => ({
      icao: aircraft.icao,
      iata: aircraft.iata,
      name: aircraft.name,
      displayName: `${aircraft.name} (${aircraft.icao}${aircraft.iata ? `/${aircraft.iata}` : ''})`
    })).sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify(aircraftList), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400' //24hrs
      }
    });

  } catch (error) {
    console.error('Error processing aircraft data:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process aircraft data' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};