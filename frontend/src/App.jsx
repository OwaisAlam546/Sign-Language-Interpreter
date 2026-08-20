import Background from './components/Background.jsx';
import Cursor from './components/Cursor.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './sections/Hero.jsx';
import LiveDemo from './sections/LiveDemo.jsx';
import HowItWorks from './sections/HowItWorks.jsx';
import SupportedGestures from './sections/SupportedGestures.jsx';
import Model from './sections/Model.jsx';
import Team from './sections/Team.jsx';
import Contact from './sections/Contact.jsx';
import Footer from './sections/Footer.jsx';

export default function App() {
  return (
    <div className="noise relative min-h-screen overflow-x-clip text-slate-100">
      <Background />
      <Cursor />
      <ScrollProgress />
      <Navbar />

      <main className="relative z-10">
        <Hero />
        <LiveDemo />
        <HowItWorks />
        <SupportedGestures />
        <Model />
        <Team />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}
