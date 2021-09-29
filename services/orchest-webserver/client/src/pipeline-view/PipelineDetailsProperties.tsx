import "codemirror/mode/javascript/javascript";

import * as React from "react";

import { MDCSelectReact, MDCTextFieldReact } from "@orchest/lib-mdc";
import {
  PromiseManager,
  RefManager,
  collapseDoubleDots,
  extensionFromFilename,
  kernelNameToLanguage,
  makeCancelable,
  makeRequest,
} from "@orchest/lib-utils";

import { Controlled as CodeMirror } from "react-codemirror2";
import ProjectFilePicker from "../components/ProjectFilePicker";
import _ from "lodash";

const ConnectionItem = ({
  connection: { name, uuid },
}: {
  connection: { name: [string, string]; uuid: string };
}) => {
  const [title, filePath] = name;

  return (
    <div className="connection-item" data-uuid={uuid}>
      <i className="material-icons">drag_indicator</i> <span>{title}</span>{" "}
      <span className="filename">({filePath})</span>
    </div>
  );
};

const KERNEL_OPTIONS = [
  ["python", "Python"],
  ["r", "R"],
  ["julia", "Julia"],
];

const PipelineDetailsProperties: React.FC<any> = (props) => {
  const { $, orchest } = window;

  const [state, setState] = React.useState({
    environmentOptions: [],
    // this is required to let users edit JSON (while typing the text will not be valid JSON)
    editableParameters: JSON.stringify(props.step.parameters, null, 2),
    autogenerateFilePath: props.step.file_path.length == 0,
  });

  const [promiseManager] = React.useState(new PromiseManager());
  const [refManager] = React.useState(new RefManager());

  const isNotebookStep = () =>
    extensionFromFilename(props.step.file_path) == "ipynb";

  const fetchEnvironmentOptions = () => {
    let environmentsEndpoint = `/store/environments/${props.project_uuid}`;

    if (isNotebookStep()) {
      environmentsEndpoint +=
        "?language=" + kernelNameToLanguage(props.step.kernel.name);
    }

    let fetchEnvironmentOptionsPromise = makeCancelable(
      makeRequest("GET", environmentsEndpoint),
      promiseManager
    );

    fetchEnvironmentOptionsPromise.promise
      .then((response) => {
        let result = JSON.parse(response);

        let environmentOptions = [];

        let currentEnvironmentInEnvironments = false;

        for (let environment of result) {
          if (environment.uuid == props.step.environment) {
            currentEnvironmentInEnvironments = true;
          }
          environmentOptions.push([environment.uuid, environment.name]);
        }

        if (!currentEnvironmentInEnvironments) {
          // update environment
          onChangeEnvironment(
            environmentOptions.length > 0 ? environmentOptions[0][0] : "",
            environmentOptions.length > 0 ? environmentOptions[0][1] : ""
          );
        }

        setState((prevState) => ({
          ...prevState,
          environmentOptions: environmentOptions,
        }));
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const onChangeFileName = (updatedFileName, autogenerated) => {
    if (!autogenerated && updatedFileName.length > 0) {
      setState((prevState) => ({
        ...prevState,
        autogenerateFilePath: false,
      }));
    }

    props.onSave(
      {
        file_path: updatedFileName,
      },
      props.step.uuid
    );
  };

  const onChangeParameterJSON = (updatedParameterJSON) => {
    setState((prevState) => ({
      ...prevState,
      editableParameters: updatedParameterJSON,
    }));

    try {
      props.onSave(
        { parameters: JSON.parse(updatedParameterJSON) },
        props.step.uuid,
        true
      );
    } catch (err) {
      // console.log("JSON did not parse")
    }
  };

  const onChangeEnvironment = (
    updatedEnvironmentUUID,
    updatedEnvironmentName
  ) => {
    props.onSave(
      {
        environment: updatedEnvironmentUUID,
        kernel: { display_name: updatedEnvironmentName },
      },
      props.step.uuid
    );
    if (updatedEnvironmentUUID !== "" && props.step["file_path"] !== "") {
      let kernelName = `orchest-kernel-${updatedEnvironmentUUID}`;

      window.orchest.jupyter.setNotebookKernel(
        collapseDoubleDots(props.pipelineCwd + props.step["file_path"]).slice(
          1
        ),
        kernelName
      );
    }
  };

  const onChangeKernel = (updatedKernel) => {
    props.onSave(
      {
        kernel: {
          name: updatedKernel,
        },
      },
      props.step.uuid
    );
  };

  const titleToFileName = (title) => {
    const alphanumeric = /[^a-zA-Z0-9-]/g;
    title = title.replace(alphanumeric, "-");
    const concatDashes = /(-+)/g;
    title = title.replace(concatDashes, "-");
    if (title.slice(-1) == "-") {
      title = title.slice(0, -1);
    }
    title = title.toLowerCase();
    return title;
  };

  const onChangeTitle = (updatedTitle) => {
    props.onSave(
      {
        title: updatedTitle,
      },
      props.step.uuid
    );
  };

  const swapConnectionOrder = (oldConnectionIndex, newConnectionIndex) => {
    // check if there is work to do
    if (oldConnectionIndex != newConnectionIndex) {
      // note it's creating a reference
      let connectionList = _.cloneDeep(props.step.incoming_connections);

      let tmp = connectionList[oldConnectionIndex];
      connectionList.splice(oldConnectionIndex, 1);
      connectionList.splice(newConnectionIndex, 0, tmp);

      props.onSave({ incoming_connections: connectionList }, props.step.uuid);
    }
  };

  const setupConnectionListener = () => {
    // initiate draggable connections

    let previousPosition = 0;
    let connectionItemOffset = 0;
    let oldConnectionIndex = 0;
    let newConnectionIndex = 0;

    let numConnectionListItems = $(refManager.refs.connectionList).find(
      ".connection-item"
    ).length;

    $(refManager.refs.connectionList).on(
      "mousedown",
      ".connection-item",
      function (e) {
        previousPosition = e.clientY;
        connectionItemOffset = 0;

        $(refManager.refs.connectionList).addClass("dragging");

        oldConnectionIndex = $(this).index();

        $(this).addClass("selected");
      }
    );

    $(document).on("mousemove.connectionList", function (e) {
      let selectedConnection = $(refManager.refs.connectionList).find(
        ".connection-item.selected"
      );

      if (selectedConnection.length > 0) {
        let positionDelta = e.clientY - previousPosition;
        let itemHeight = selectedConnection.outerHeight();

        connectionItemOffset += positionDelta;

        // limit connectionItemOffset
        if (connectionItemOffset < -itemHeight * oldConnectionIndex) {
          connectionItemOffset = -itemHeight * oldConnectionIndex;
        } else if (
          connectionItemOffset >
          itemHeight * (numConnectionListItems - oldConnectionIndex - 1)
        ) {
          connectionItemOffset =
            itemHeight * (numConnectionListItems - oldConnectionIndex - 1);
        }

        selectedConnection.css({
          transform: "translateY(" + connectionItemOffset + "px)",
        });

        previousPosition = e.clientY;

        // find new index based on current position
        let elementYPosition =
          (oldConnectionIndex * itemHeight + connectionItemOffset) / itemHeight;

        newConnectionIndex = Math.min(
          Math.max(0, Math.round(elementYPosition)),
          numConnectionListItems - 1
        );

        // evaluate swap classes for all elements in list besides selectedConnection
        for (let i = 0; i < numConnectionListItems; i++) {
          if (i != oldConnectionIndex) {
            let connectionListItem = $(refManager.refs.connectionList)
              .find(".connection-item")
              .eq(i);

            connectionListItem.removeClass("swapped-up");
            connectionListItem.removeClass("swapped-down");

            if (newConnectionIndex >= i && i > oldConnectionIndex) {
              connectionListItem.addClass("swapped-up");
            } else if (newConnectionIndex <= i && i < oldConnectionIndex) {
              connectionListItem.addClass("swapped-down");
            }
          }
        }
      }
    });

    // Note, listener should be unmounted
    $(document).on("mouseup.connectionList", function (e) {
      let selectedConnection = $(refManager.refs.connectionList).find(
        ".connection-item.selected"
      );

      if (selectedConnection.length > 0) {
        selectedConnection.css({ transform: "" });
        selectedConnection.removeClass("selected");

        $(refManager.refs.connectionList)
          .find(".connection-item")
          .removeClass("swapped-up")
          .removeClass("swapped-down");

        $(refManager.refs.connectionList).removeClass("dragging");

        swapConnectionOrder(oldConnectionIndex, newConnectionIndex);
      }
    });
  };

  const clearConnectionListener = () => {
    $(document).off("mouseup.connectionList");
    $(document).off("mousemove.connectionList");
  };

  React.useEffect(() => {
    if (!props.readOnly) {
      // set focus on first field
      refManager.refs.titleTextField.focus();
    }

    fetchEnvironmentOptions();

    return () => {
      promiseManager.cancelCancelablePromises();
      clearConnectionListener();
    };
  }, []);

  React.useEffect(() => {
    if (state.autogenerateFilePath) {
      // Make sure the props have been updated
      onChangeFileName(titleToFileName(props.step.title), true);
    }
  }, [props?.step?.title]);

  React.useEffect(() => {
    clearConnectionListener();
    setupConnectionListener();
  }, [props.step]);

  React.useEffect(() => fetchEnvironmentOptions(), [
    props?.step?.file_path,
    props?.step?.kernel?.name,
  ]);

  return (
    <div className={"detail-subview"}>
      <div className="input-group">
        <MDCTextFieldReact
          value={props.step.title}
          onChange={onChangeTitle}
          label="Title"
          disabled={props.readOnly}
          classNames={["fullwidth", "push-down"]}
          ref={refManager.nrefs.titleTextField}
          data-test-id="step-title-textfield"
        />

        <div className="push-down">
          {props.readOnly ? (
            <MDCTextFieldReact
              value={props.step.file_path}
              label="File name"
              disabled={props.readOnly}
              classNames={["fullwidth", "push-down"]}
              data-test-id="step-file-name-textfield"
            />
          ) : (
            <ProjectFilePicker
              cwd="/"
              value={props.step.file_path}
              project_uuid={props.project_uuid}
              pipeline_uuid={props.pipeline_uuid}
              step_uuid={props.step.uuid}
              onChange={onChangeFileName}
            />
          )}
        </div>

        <MDCSelectReact
          label="Kernel language"
          onChange={onChangeKernel}
          options={KERNEL_OPTIONS}
          value={props.step.kernel.name}
          disabled={props.readOnly}
          classNames={(() => {
            let classes = ["push-down", "fullwidth"];
            if (!isNotebookStep()) {
              classes.push("hidden");
            }
            return classes;
          })()}
        />

        <MDCSelectReact
          label="Environment"
          disabled={props.readOnly}
          classNames={["fullwidth"]}
          onChange={onChangeEnvironment}
          options={state.environmentOptions}
          value={props.step.environment}
        />
      </div>

      <div className="input-group">
        <h3>Parameters</h3>

        <CodeMirror
          value={state.editableParameters}
          options={{
            mode: "application/json",
            theme: "jupyter",
            lineNumbers: true,
            readOnly: props.readOnly === true, // not sure whether CodeMirror accepts 'falsy' values
          }}
          onBeforeChange={(editor, data, value) => {
            onChangeParameterJSON(value);
          }}
        />

        {(() => {
          try {
            JSON.parse(state.editableParameters);
          } catch {
            return (
              <div className="warning push-up push-down">
                <i className="material-icons">warning</i> Your input is not
                valid JSON.
              </div>
            );
          }
        })()}
      </div>

      {props.step.incoming_connections.length != 0 && (
        <div className="input-group">
          <h3>Connections</h3>

          <div
            className="connection-list"
            ref={refManager.nrefs.connectionList}
          >
            {props.step.incoming_connections.map((item: string) => (
              <ConnectionItem
                connection={{
                  name: props.connections[item],
                  uuid: item,
                }}
                key={item}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineDetailsProperties;