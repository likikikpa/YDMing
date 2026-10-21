import { creditsText, download } from "../export";
import { Download, ExternalLink } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function CreditsModal({ app }: { app: ReadyApp }) {
  const { commit, project, t } = app;
  return (
    <>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={project.commercial}
          onChange={(e) =>
            commit(
              { ...project, commercial: e.target.checked },
              "Change commercial usage",
            )
          }
        />
        {t("Commercial project")}
      </label>
      <div className="credits-list">
        <article>
          <h3>System Reference Document 5.2</h3>
          <span className="licence-tag">CC BY 4.0</span>
          <p>
            Wizards of the Coast LLC · 331 creatures, 760 magic items. Imported
            via Open5e, adapted for room generation.
          </p>
          <a
            href="https://www.dndbeyond.com/srd"
            target="_blank"
            rel="noreferrer"
          >
            SRD 5.2 <ExternalLink size={11} />
          </a>
          <p>
            This work includes material from the System Reference Document 5.2
            (“SRD 5.2”) by Wizards of the Coast LLC, available at
            www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
            Commons Attribution 4.0 International License available at{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/legalcode"
              target="_blank"
              rel="noreferrer"
            >
              creativecommons.org/licenses/by/4.0/legalcode
            </a>
            .
          </p>
        </article>
        {project.credits.map((c) => (
          <article key={c.id}>
            <h3>{c.name}</h3>
            <span
              className={`licence-tag ${project.commercial && /\bNC\b/i.test(c.license) ? "warning" : ""}`}
            >
              {c.license}
            </span>
            {project.commercial && /\bNC\b/i.test(c.license) && (
              <p className="error-message">{t("Non-commercial asset")}</p>
            )}
            <p>{c.author}</p>
            {c.url && (
              <a
                href={/^https?:\/\//.test(c.url) ? c.url : undefined}
                target="_blank"
                rel="noreferrer"
              >
                {t("Source link")} <ExternalLink size={11} />
              </a>
            )}
          </article>
        ))}
      </div>
      <button
        className="button subtle full"
        onClick={() =>
          download(
            new Blob([creditsText(project)], { type: "text/plain" }),
            "CREDITS.txt",
          )
        }
      >
        <Download size={14} />
        {t("Credits")}
      </button>
    </>
  );
}
