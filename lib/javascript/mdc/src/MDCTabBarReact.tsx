import { MDCTabBar } from "@material/tab-bar";
import { RefManager } from "@orchest/lib-utils";
import * as React from "react";

// used only in orchest-webserver
export class MDCTabBarReact extends React.Component<any, any> {
  refManager: RefManager;
  tabBar: MDCTabBar;
  buttons: any[];

  constructor(props) {
    super(props);

    let index = 0;

    if (this.props.selectedIndex) {
      index = this.props.selectedIndex;
    }

    this.state = {
      active_tab_index: index,
    };

    this.refManager = new RefManager();
  }

  componentDidMount() {
    this.tabBar = new MDCTabBar(this.refManager.refs.tabBar);
    this.tabBar.focusOnActivate = false;
    this.tabBar.activateTab(this.state.active_tab_index);

    this.tabBar.listen("MDCTabBar:activated", (details: any) => {
      this.setState({ active_tab_index: details.detail.index });

      if (this.props.onChange) {
        this.props.onChange(details.detail.index);
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.selectedIndex != prevProps.selectedIndex) {
      this.tabBar.activateTab(this.props.selectedIndex);
    }
  }

  render() {
    this.buttons = [];

    for (let key in this.props.items) {
      let item = this.props.items[key];

      let iconCode: string = this.props.icons ? this.props.icons[key] : "";

      // TODO: for now we only have Orchest logo as a custom img, the 2px padding is a temporary workaround
      const icon =
        iconCode.charAt(0) === "/" ? (
          <img src={iconCode} style={{ padding: "2px" }} />
        ) : (
          iconCode
        );

      this.buttons.push(
        <button
          key={key}
          className="mdc-tab"
          role="tab"
          aria-selected="true"
          data-test-id={
            this.props["data-test-id"] +
            `-tab-${item.toLowerCase().replace(/[\W]/g, "-")}`
          }
        >
          <span className="mdc-tab__content">
            {icon && (
              <span className="mdc-tab__icon material-icons" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="mdc-tab__text-label">{item}</span>
          </span>
          <span
            className={(() => {
              let classNames = ["mdc-tab-indicator"];
              if (key == this.state.active_tab_index) {
                classNames.push("mdc-tab-indicator--active");
              }
              return classNames.join(" ");
            })()}
          >
            <span className="mdc-tab-indicator__content mdc-tab-indicator__content--underline"></span>
          </span>
          <span className="mdc-tab__ripple"></span>
        </button>
      );
    }

    return (
      <div className="mdc-tab-bar-holder">
        <div
          className="mdc-tab-bar"
          ref={this.refManager.nrefs.tabBar}
          role="tablist"
        >
          <div className="mdc-tab-scroller">
            <div className="mdc-tab-scroller__scroll-area">
              <div className="mdc-tab-scroller__scroll-content">
                {this.buttons}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
