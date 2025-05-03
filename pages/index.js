// pages/index.js
export default function Home() {
    return (
      <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
        <h1>Mentor Chatbot</h1>
        <iframe
          src="/index.html"
          style={{ width: '100%', height: '90vh', border: 'none' }}
          title="Mentor Chatbot"
        />
      </div>
    );
  }
  