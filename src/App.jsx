import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { Calendar, Filter, MapPin, Plus, Upload, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

function MapRecenter({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions);
    }
  }, [positions, map]);
  return null;
}

export default function App() {
  const [hikes, setHikes] = useState([]);
  const [date, setDate] = useState('');
  const [type, setType] = useState('Hiking');
  const [notes, setNotes] = useState('');
  const [gpxData, setGpxData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Fetch all hikes from Cloudflare D1 when the app loads
  useEffect(() => {
    fetch('/api')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHikes(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Database loading error:", err);
        setIsLoading(false);
      });
  }, []);

  const handleGpxUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const latMatches = [...text.matchAll(/lat="([^"]+)"/g)];
      const lonMatches = [...text.matchAll(/lon="([^"]+)"/g)];
      
      const coordinates = latMatches.map((match, index) => [
        parseFloat(match[1]),
        parseFloat(lonMatches[index] ? lonMatches[index][1] : 0)
      ]);

      if (coordinates.length > 0) {
        setGpxData(coordinates);
      } else {
        alert("Could not read map markers from this GPX file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveHike = async (e) => {
    e.preventDefault();
    if (!date) return alert("Please select a date");

    const newHike = {
      id: Date.now().toString(),
      date,
      type,
      notes,
      coordinates: gpxData || []
    };

    // Optimistically update frontend interface instantly
    setHikes([newHike, ...hikes]);

    // Send payload permanently up to Cloudflare D1 database
    try {
      await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHike)
      });
    } catch (err) {
      alert("Failed to securely sync entry to cloud.");
    }

    // Reset Entry Fields
    setDate('');
    setNotes('');
    setGpxData(null);
  };

  const years = ['All', ...new Set(hikes.map(h => new Date(h.date).getFullYear().toString()))];

  const filteredHikes = hikes.filter(hike => {
    const matchType = filterType === 'All' || hike.type === filterType;
    const matchYear = filterYear === 'All' || new Date(hike.date).getFullYear().toString() === filterYear;
    return matchType && matchYear;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight text-white">TrailLog <span className="text-xs text-emerald-400 font-mono">D1 Database Connected</span></h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> Log a New Activity
            </h2>
            <form onSubmit={handleSaveHike} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">Activity Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="Hiking">🥾 Hiking</option>
                  <option value="Beach Cleaning">🏖️ Beach Cleaning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">GPX Route File</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-lg py-4 cursor-pointer transition-colors bg-slate-900/50">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-400">{gpxData ? "🗺️ GPX Loaded Successfully!" : "Choose .gpx file"}</span>
                  <input type="file" accept=".gpx" onChange={handleGpxUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">Notes / Location</label>
                <textarea rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Where did you go? Notes..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500 text-sm" />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-500/10">
                Save Activity
              </button>
            </form>
          </div>

          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" /> Filter Logs
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white">
                  <option value="All">All Types</option>
                  <option value="Hiking">Hiking</option>
                  <option value="Beach Cleaning">Beach Cleaning</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Year</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white">
                  {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl h-96 overflow-hidden relative shadow-xl">
            <MapContainer center={[22.3193, 114.1694]} zoom={11} scrollWheelZoom={true} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}://{z}/{x}/{y}.png"
              />
              {selectedTrack && selectedTrack.coordinates.length > 0 && (
                <>
                  <Polyline positions={selectedTrack.coordinates} color="#34d399" weight={4} opacity={0.8} />
                  <MapRecenter positions={selectedTrack.coordinates} />
                </>
              )}
            </MapContainer>
            {!selectedTrack && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-10 pointer-events-none">
                <p className="text-sm text-slate-400 bg-slate-900/90 px-4 py-2 border border-slate-800 rounded-full">
                  💡 Tap an entry below to draw its GPX track map trace line
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white px-1">Your Records ({filteredHikes.length})</h2>
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 text-sm">Contacting database...</div>
            ) : filteredHikes.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                No entries match your selections.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredHikes.map((hike) => (
                  <div 
                    key={hike.id}
                    onClick={() => hike.coordinates.length > 0 && setSelectedTrack(hike)}
