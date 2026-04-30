'use client';

import { useState } from 'react';

export default function AuthorityPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);

    const res = await fetch('/api/authority/generate', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold">Authority Engine</h1>

      <p className="mt-2 text-gray-600">
        Turn one blog into multiple authority-building assets.
      </p>

      <textarea
        className="w-full mt-6 p-4 border rounded-lg"
        rows={10}
        placeholder="Paste your blog content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        onClick={handleGenerate}
        className="mt-4 px-6 py-3 bg-black text-white rounded-lg"
      >
        {loading ? 'Generating...' : 'Generate Authority Assets'}
      </button>

      {result && (
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold">LinkedIn Post</h2>
            <p>{result.linkedin}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Guest Pitch</h2>
            <p>{result.guestPitch}</p>
          </section>

          {/* Add remaining sections */}
        </div>
      )}
    </main>
  );
}
