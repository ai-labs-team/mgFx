import React from 'react';
import { ContextMenuTarget, Menu } from '@blueprintjs/core';
import { Span } from '@mgfx/analyzer';
import { __RouterContext as RouterContext, RouteComponentProps } from 'react-router';
import { NavMenuItem } from './NavMenuItem';

type Props = {
  span: Span;
  goToTimeline?: boolean;
};

type TargetProps = Props & {
  routerContext: RouteComponentProps;
};

const SpanContextMenuTarget = ContextMenuTarget(
  class ItemContextMenu extends React.Component<TargetProps> {
    render() {
      return this.props.children as any;
    }

    renderContextMenu() {
      const { span, goToTimeline } = this.props;

      const timelineLink = goToTimeline ? (
        <NavMenuItem icon="gantt-chart" text="Show on Timeline" to={`/timeline?span=${span.id}&selectedId=${span.id}`} />
      ) : (
        <NavMenuItem icon="zoom-to-fit" text="Zoom to Fit" to={`/timeline?span=${span.id}&selectedId=${span.id}`} />
      );

      return (
        <RouterContext.Provider value={this.props.routerContext}>
          <Menu>{timelineLink}</Menu>
        </RouterContext.Provider>
      );
    }
  }
);

export const SpanContextMenu: React.FC<Props> = (props) => (
  <SpanContextMenuTarget
    {...props}
    routerContext={React.useContext(RouterContext)}
  />
);