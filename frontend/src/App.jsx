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
import ContactCTA from './sections/ContactCTA.jsx';
import ContactPage from './sections/ContactPage.jsx';
import AnalyticsPage from './sections/AnalyticsPage.jsx';
import Footer from './sections/Footer.jsx';
import WaveDivider from './components/WaveDivider.jsx';
import { useRouter } from './context/RouterContext.jsx';

export default function App() {
  const { path } = useRouter();
  const isContactPage = path === '/contact';
  const isAnalyticsPage = path === '/analytics';

  return (
    <div className="noise relative min-h-screen overflow-x-clip text-[var(--text-main)]">
      <Background />
      <Cursor />
      <ScrollProgress />
      <Navbar />

      <main className="relative z-10">
        {isAnalyticsPage ? (
          <AnalyticsPage />
        ) : isContactPage ? (
          <ContactPage />
        ) : (
          <>
            <Hero />
            <WaveDivider className="light-only-wave" flip={false} height={44} />
            <LiveDemo />
            <WaveDivider className="light-only-wave" flip={true} height={44} />
            <HowItWorks />
            <WaveDivider className="light-only-wave" flip={false} height={44} />
            <SupportedGestures />
            <WaveDivider className="light-only-wave" flip={true} height={44} />
            <Model />
            <WaveDivider className="light-only-wave" flip={false} height={44} />
            <Team />
            <WaveDivider className="light-only-wave" flip={true} height={44} />
            <ContactCTA />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

