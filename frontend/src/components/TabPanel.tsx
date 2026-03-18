import React from "react";

interface TabPanelProps {
  children?: React.ReactNode;
  tabIndex: number;
  currentTabIndex: number;
}

export const TabPanel = ({
  children,
  tabIndex,
  currentTabIndex,
}: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={currentTabIndex !== tabIndex}
      id={`simple-tabpanel-${tabIndex}`}
      style={{ height: "100%" }}
    >
      {currentTabIndex == tabIndex && <>{children}</>}
    </div>
  );
};
