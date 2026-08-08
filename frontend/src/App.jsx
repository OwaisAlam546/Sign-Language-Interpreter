import Background from './components/Background.jsx';
import Cursor from './components/Cursor.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './sections/Hero.jsx';
import LiveDemo from './sections/LiveDemo.jsx';
import HowItWorks from './sections/HowItWorks.jsx';
import Features from './sections/Features.jsx';
import SupportedGestures from './sections/SupportedGestures.jsx';
import Model from './sections/Model.jsx';
import TechStack from './sections/TechStack.jsx';
import AboutProject from './sections/AboutProject.jsx';
import Team from './sections/Team.jsx';
import Architecture from './sections/Architecture.jsx';
import Screenshots from './sections/Screenshots.jsx';
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
        <Features />
        <SupportedGestures />
        <Model />
        <TechStack />
        <AboutProject />
        <Team />
        <Architecture />
        <Screenshots />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}