import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";
import { cn } from "../utils/cn";

export function PrivacyPolicy() {
  const [accepted, setAccepted] = useState(false);
  const { acceptPrivacy, privacyAccepted } = useAppStore();
  const navigate = useNavigate();

  if (privacyAccepted) {
    return <Navigate to="/survey" replace />;
  }

  const handleContinue = () => {
    acceptPrivacy();
    navigate("/survey");
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen">
      <div className="max-w-3xl w-full mx-auto p-6 flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
            Privacy Policy & Informed Consent
          </h1>
          <p className="text-zinc-400 mt-2">
            Please read the following carefully before proceeding.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-32 custom-scrollbar">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-8 text-zinc-300 leading-relaxed">
            {/* Purpose */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                Purpose of This Study
              </h2>
              <p>
                This is a university research project studying how people find
                and fix security vulnerabilities in software, and whether AI
                assistance affects the outcome. Your participation helps us
                understand the role of AI tools in software security.
              </p>
            </section>

            {/* What we collect */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                What Data We Collect
              </h2>
              <p className="mb-3">
                During your participation, we collect the following:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <span className="text-zinc-100 font-medium">
                    Access token
                  </span>{" "}
                  &mdash; a 6-character code used to identify your session. This
                  is not linked to your real name or personal identity.
                </li>
                <li>
                  <span className="text-zinc-100 font-medium">
                    Group assignment
                  </span>{" "}
                  &mdash; which experimental group (A, B, or C) you are placed
                  in, which determines your scenario order and whether AI help
                  is available.
                </li>
                <li>
                  <span className="text-zinc-100 font-medium">
                    Survey answers
                  </span>{" "}
                  &mdash; your responses to the preliminary questionnaire about
                  your programming background and experience.
                </li>
                <li>
                  <span className="text-zinc-100 font-medium">
                    Code submissions
                  </span>{" "}
                  &mdash; the Python code you write or modify during each
                  scenario, including your final submission.
                </li>
                <li>
                  <span className="text-zinc-100 font-medium">
                    Timing data
                  </span>{" "}
                  &mdash; how long you spend on each scenario (up to the
                  20-minute limit).
                </li>
              </ul>
            </section>

            {/* What we do NOT collect */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                What We Do NOT Collect
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Your real name, email address, or any contact information</li>
                <li>Your IP address or device fingerprint</li>
                <li>Browsing history or activity outside this application</li>
                <li>Cookies for tracking or advertising purposes</li>
              </ul>
              <p className="mt-3">
                Your participation is pseudonymous. We identify you only by your
                access token.
              </p>
            </section>

            {/* How we use data */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                How We Use Your Data
              </h2>
              <p className="mb-3">Your data will be used exclusively to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Analyze and compare performance in finding and fixing security
                  vulnerabilities with and without AI assistance
                </li>
                <li>
                  Produce aggregated, anonymized statistics for academic
                  research and publication
                </li>
              </ul>
              <p className="mt-3">
                We will never sell your data, use it for marketing, or share it
                with third parties outside the research team. If results are
                published, only aggregate statistics will be reported &mdash; no
                individual responses will be identifiable.
              </p>
            </section>

            {/* Data storage */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                Data Storage & Security
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Your data is stored in a secure, cloud-hosted PostgreSQL
                  database (Supabase) with row-level security policies enabled.
                </li>
                <li>
                  All communication between your browser and the server uses
                  HTTPS encryption.
                </li>
                <li>
                  Python code execution happens entirely in your browser via
                  WebAssembly &mdash; your code is never sent to an external
                  server for execution.
                </li>
                <li>
                  Access to the raw data is restricted to members of the
                  research team.
                </li>
                <li>
                  Data will be retained only for the duration of the research
                  project and will be deleted afterward.
                </li>
              </ul>
            </section>

            {/* Local storage */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                Browser Local Storage
              </h2>
              <p>
                This application saves your progress (token, survey completion
                status, and completed scenarios) in your browser's local
                storage. This is used solely to let you resume your session if
                you refresh the page. This data stays on your device and is
                cleared when you log out.
              </p>
            </section>

            {/* Your rights */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                Your Rights
              </h2>
              <p className="mb-3">As a participant, you have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <span className="text-zinc-100 font-medium">Withdraw</span>{" "}
                  &mdash; you can stop participating at any time by simply
                  closing the browser. There is no penalty for withdrawing.
                </li>
                <li>
                  <span className="text-zinc-100 font-medium">
                    Access your data
                  </span>{" "}
                  &mdash; you can request a copy of all data associated with
                  your access token.
                </li>
                <li>
                  <span className="text-zinc-100 font-medium">
                    Request deletion
                  </span>{" "}
                  &mdash; you can ask us to permanently delete all data
                  associated with your access token at any time.
                </li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact the research team and
                provide your 6-character access token so we can locate your
                records.
              </p>
            </section>

            {/* Voluntary */}
            <section>
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">
                Voluntary Participation
              </h2>
              <p>
                Your participation is entirely voluntary. You are free to skip
                the study or withdraw at any point. Choosing not to participate
                will have no negative consequences.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="checkbox"
              aria-checked={accepted}
              onClick={() => setAccepted((prev) => !prev)}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                accepted
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-zinc-600 hover:border-zinc-500",
              )}
            >
              {accepted && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
            <span className="text-sm text-zinc-300">
              I have read and accept the privacy policy
            </span>
          </label>

          <Button onClick={handleContinue} disabled={!accepted} size="lg">
            Continue to Survey
          </Button>
        </div>
      </div>
    </div>
  );
}
