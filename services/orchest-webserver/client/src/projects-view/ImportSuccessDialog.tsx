import { MDCButtonReact, MDCDialogReact } from "@orchest/lib-mdc";
import React from "react";

const ImportSuccessDialog: React.FC<{
  projectName: string;
  goToPipelines: () => void;
  close: () => void;
}> = ({ projectName, goToPipelines, close }) => {
  return (
    <MDCDialogReact
      title="Import complete"
      onClose={close}
      content={
        <div className="project-import-modal">
          <p className="push-down">
            You have imported <span className="bold">{projectName}</span>{" "}
            successfully! It is now visible in your project list.
          </p>
        </div>
      }
      actions={
        <>
          <MDCButtonReact
            classNames={["push-right"]}
            label="Continue browsing"
            onClick={close}
          />
          <MDCButtonReact
            label="View pipelines"
            classNames={["mdc-button--raised", "themed-secondary"]}
            onClick={goToPipelines}
          />
        </>
      }
    />
  );
};

export { ImportSuccessDialog };
