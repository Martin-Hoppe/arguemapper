import { Box, Drawer, DrawerProps } from "@material-ui/core";
import React from "react";

const Sidebar: React.FC<{side: DrawerProps["anchor"], drawerWidth: number, isMobile: boolean, isOpen: boolean, setIsOpen: (x: boolean) => void}> = ({side, drawerWidth, isMobile, isOpen, setIsOpen, children}) => {
    return <Box sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
            variant={isMobile ? "temporary" : "persistent"}
            open={isOpen || !isMobile}
            onClose={() => setIsOpen(false)}
            anchor={side}
            // transitionDuration={
            //   isMobile
            //     ? { enter: duration.enteringScreen, exit: duration.leavingScreen }
            //     : 0
            // }
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: drawerWidth } }}
        >
            {children}
        </Drawer>
    </Box>
}

export default Sidebar
