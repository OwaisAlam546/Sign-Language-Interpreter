import { useEffect } from 'react';
import AnalyticsHero from './analytics/AnalyticsHero.jsx';
import KeyMetricsRow from './analytics/KeyMetricsRow.jsx';
import GlobalLandscapeSection from './analytics/GlobalLandscapeSection.jsx';
import ClassPerformanceSection from './analytics/ClassPerformanceSection.jsx';
import ConfusionMatrixSection from './analytics/ConfusionMatrixSection.jsx';
import TrainingPerformanceSection from './analytics/TrainingPerformanceSection.jsx';
import DatasetAnalysisSection from './analytics/DatasetAnalysisSection.jsx';
import RealTimeInferenceSection from './analytics/RealTimeInferenceSection.jsx';
import PredictionStabilitySection from './analytics/PredictionStabilitySection.jsx';
import ErrorAnalysisSection from './analytics/ErrorAnalysisSection.jsx';
import EvaluationMethodologySection from './analytics/EvaluationMethodologySection.jsx';
import { ANALYTICS_DATA } from '../lib/analyticsData.js';
import { useRouter } from '../context/RouterContext.jsx';
import { FiArrowLeft, FiCamera, FiBookOpen } from 'react-icons/fi';

export default function AnalyticsPage() {
  const { navigate } = useRouter();

  useEffect(() => {
    // Set document title as specified in prompt
    document.title = 'SignSpeak AI — Model Analytics';

    // Scroll to top on page load
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="relative min-h-screen text-[var(--text-main)]">
      {/* 1. Analytics Hero */}
      <AnalyticsHero
        data={ANALYTICS_DATA}
        status={ANALYTICS_DATA.status}
      />

      {/* 2. Key Performance Metrics Row */}
      <KeyMetricsRow
        metrics={ANALYTICS_DATA.metrics}
      />

      {/* 3. Global Sign Language Landscape */}
      <GlobalLandscapeSection
        landscape={ANALYTICS_DATA.landscape}
      />

      {/* 4. Class-wise Recognition Performance */}
      <ClassPerformanceSection
        classPerformance={ANALYTICS_DATA.classPerformance}
      />

      {/* 5. Confusion Matrix */}
      <ConfusionMatrixSection
        confusionMatrix={ANALYTICS_DATA.confusionMatrix}
      />

      {/* 6. Training Performance */}
      <TrainingPerformanceSection
        trainingHistory={ANALYTICS_DATA.trainingHistory}
      />

      {/* 7. Dataset Analysis */}
      <DatasetAnalysisSection
        dataset={ANALYTICS_DATA.dataset}
      />

      {/* 8. Real-Time Inference Performance */}
      <RealTimeInferenceSection
        inference={ANALYTICS_DATA.inference}
      />

      {/* 9. Prediction Stability */}
      <PredictionStabilitySection
        stability={ANALYTICS_DATA.stability}
      />

      {/* 10. Error Analysis */}
      <ErrorAnalysisSection
        errors={ANALYTICS_DATA.errors}
      />

      {/* 11. Evaluation Methodology */}
      <EvaluationMethodologySection
        methodology={ANALYTICS_DATA.methodology}
      />

      {/* Return to Live Interpreter / Home CTA bar */}
      <div className="relative py-12 border-t border-white/[0.08] bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-card flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/90 p-5 sm:p-6 backdrop-blur-xl">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                Test the Model in Real-Time
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Launch the camera interpreter to experience client-side ONNX recognition in action.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/', 'demo')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 font-sans text-xs sm:text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:opacity-95 transition-opacity cursor-pointer"
              >
                <FiCamera className="h-4 w-4" />
                <span>Launch Live Interpreter</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-sans text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
              >
                <FiArrowLeft className="h-4 w-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
