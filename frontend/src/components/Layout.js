import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import styled from 'styled-components';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.aside`
  width: 250px;
  background-color: #1a1a1b;
  color: white;
  padding: 20px 0;
`;

const Logo = styled.div`
  padding: 0 20px 20px;
  font-size: 24px;
  font-weight: bold;
  color: var(--primary-color);
  border-bottom: 1px solid #333;
  margin-bottom: 20px;
`;

const NavMenu = styled.nav`
  display: flex;
  flex-direction: column;
`;

const StyledNavLink = styled(NavLink)`
  color: white;
  padding: 12px 20px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background-color: #333;
    text-decoration: none;
  }

  &.active {
    background-color: var(--primary-color);
    font-weight: 600;
  }
`;

const ContentArea = styled.main`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
`;

const ActionButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background-color: #e03d00;
  }
`;

function Layout() {
  return (
    <LayoutContainer>
      <Sidebar>
        <Logo>RediTrend</Logo>
        <NavMenu>
          <StyledNavLink to="/">
            <span className="material-icons">dashboard</span>
            Dashboard
          </StyledNavLink>
          <StyledNavLink to="/create">
            <span className="material-icons">add_circle</span>
            Create New
          </StyledNavLink>
          <StyledNavLink to="/reddit">
            <span className="material-icons">trending_up</span>
            Reddit Trends
          </StyledNavLink>
          <StyledNavLink to="/script">
            <span className="material-icons">description</span>
            Script Generator
          </StyledNavLink>
          <StyledNavLink to="/voice">
            <span className="material-icons">record_voice_over</span>
            Voice Generator
          </StyledNavLink>
          <StyledNavLink to="/video">
            <span className="material-icons">videocam</span>
            Video Creator
          </StyledNavLink>
          <StyledNavLink to="/youtube">
            <span className="material-icons">smart_display</span>
            YouTube Uploader
          </StyledNavLink>
          <StyledNavLink to="/analytics">
            <span className="material-icons">bar_chart</span>
            Analytics
          </StyledNavLink>
        </NavMenu>
      </Sidebar>
      <ContentArea>
        <Outlet />
      </ContentArea>
    </LayoutContainer>
  );
}

export default Layout;