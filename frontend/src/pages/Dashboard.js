import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const DashboardContainer = styled.div`
  padding: 20px;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
`;

const CreateButton = styled(Link)`
  background-color: var(--primary-color);
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background-color: #e03d00;
    text-decoration: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
`;

const RecentVideosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const VideoCard = styled.div`
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const VideoThumbnail = styled.div`
  height: 180px;
  background-color: #eee;
  background-image: ${props => props.image ? `url(${props.image})` : 'none'};
  background-size: cover;
  background-position: center;
`;

const VideoInfo = styled.div`
  padding: 16px;
`;

const VideoTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--text-secondary);
`;

const ServiceStatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const StatusCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatusIndicator = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => 
    props.status === 'OK' ? 'var(--success-color)' : 
    props.status === 'Degraded' ? 'var(--warning-color)' : 'var(--error-color)'};
  margin-right: 8px;
`;

const StatusLabel = styled.div`
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-top: 8px;
`;

const ServiceName = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
`;

function Dashboard() {
  // Fetch services health
  const { data: healthData, isLoading: healthLoading } = useQuery(
    'services-health',
    async () => {
      try {
        const response = await axios.get('/api/v1/health');
        return response.data;
      } catch (error) {
        console.error('Error fetching service health:', error);
        return { status: 'ERROR', services: [] };
      }
    },
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  // Fetch recent videos
  const { data: videosData, isLoading: videosLoading } = useQuery(
    'recent-videos',
    async () => {
      try {
        const response = await axios.get('/api/v1/analytics/videos');
        return response.data.videos;
      } catch (error) {
        console.error('Error fetching recent videos:', error);
        return [];
      }
    }
  );

  // Placeholder stats
  const stats = [
    { label: 'Total Videos Created', value: videosData ? videosData.length : 0 },
    { label: 'Total Views', value: videosData ? videosData.reduce((sum, video) => sum + (video.metrics[0]?.views || 0), 0) : 0 },
    { label: 'Trending Subreddits', value: 5 },
    { label: 'Scripts Generated', value: 12 }
  ];

  return (
    <DashboardContainer>
      <Header>
        <Title>Dashboard</Title>
        <CreateButton to="/create">
          <span className="material-icons">add_circle</span>
          Create New Video
        </CreateButton>
      </Header>

      <StatsGrid>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
          </StatCard>
        ))}
      </StatsGrid>

      <SectionTitle>Recent Videos</SectionTitle>
      <RecentVideosGrid>
        {videosLoading ? (
          <div>Loading recent videos...</div>
        ) : videosData?.length > 0 ? (
          videosData.slice(0, 6).map((video) => (
            <VideoCard key={video.videoId}>
              <VideoThumbnail image={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`} />
              <VideoInfo>
                <VideoTitle>{video.title || 'Untitled Video'}</VideoTitle>
                <VideoMeta>
                  <div>{video.metrics[0]?.views || 0} views</div>
                  <div>{new Date(video.uploadDate).toLocaleDateString()}</div>
                </VideoMeta>
              </VideoInfo>
            </VideoCard>
          ))
        ) : (
          <div>No videos found. Create your first video!</div>
        )}
      </RecentVideosGrid>

      <SectionTitle>Service Status</SectionTitle>
      <ServiceStatusGrid>
        {healthLoading ? (
          <div>Loading service status...</div>
        ) : (
          <>
            <StatusCard>
              <ServiceName>Gateway</ServiceName>
              <StatusLabel>
                <StatusIndicator status={healthData?.gateway || 'ERROR'} />
                {healthData?.gateway || 'ERROR'}
              </StatusLabel>
            </StatusCard>
            
            {healthData?.services?.map((service) => (
              <StatusCard key={service.service}>
                <ServiceName>{service.service}</ServiceName>
                <StatusLabel>
                  <StatusIndicator status={service.status} />
                  {service.status}
                </StatusLabel>
              </StatusCard>
            ))}
          </>
        )}
      </ServiceStatusGrid>
    </DashboardContainer>
  );
}

export default Dashboard;