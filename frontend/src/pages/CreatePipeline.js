import React, { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';

const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.header`
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 30px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 16px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: var(--border-color);
    z-index: 1;
  }
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.active ? 'var(--primary-color)' : props.completed ? 'var(--success-color)' : 'white'};
  border: 2px solid ${props => props.completed ? 'var(--success-color)' : props.active ? 'var(--primary-color)' : 'var(--border-color)'};
  color: ${props => (props.active || props.completed) ? 'white' : 'var(--text-secondary)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 8px;
`;

const StepLabel = styled.div`
  font-size: 14px;
  color: ${props => props.active ? 'var(--primary-color)' : 'var(--text-secondary)'};
  font-weight: ${props => props.active ? '600' : 'normal'};
`;

const FormCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
`;

const Input = styled(Field)`
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-color);
  }
`;

const TextArea = styled(Field)`
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-color);
  }
`;

const Select = styled(Field)`
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-color);
  }
`;

const ErrorText = styled.div`
  color: var(--error-color);
  font-size: 12px;
  margin-top: 4px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
`;

const BackButton = styled(Button)`
  background-color: white;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  
  &:hover {
    background-color: #f0f0f0;
  }
`;

const NextButton = styled(Button)`
  background-color: var(--primary-color);
  border: none;
  color: white;
  
  &:hover {
    background-color: #e03d00;
  }
`;

const ResultCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-top: 30px;
`;

const ResultTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const Progress = styled.div`
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 4px;
  width: ${props => props.value}%;
  transition: width 0.3s ease;
`;

const ProgressLabel = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 30px;
`;

const ResultDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;

const DetailItem = styled.div`
  margin-bottom: 16px;
`;

const DetailLabel = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-weight: 600;
`;

const VideoPreview = styled.div`
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f0f0f0;
  position: relative;
  padding-top: 56.25%; /* 16:9 aspect ratio */
`;

const Video = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const Checkbox = styled(Field)`
  margin-right: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const OptionCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const OptionCard = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 2px solid ${props => props.selected ? 'var(--primary-color)' : 'var(--border-color)'};
  border-radius: 8px;
  cursor: pointer;
  background-color: ${props => props.selected ? 'rgba(255, 69, 0, 0.05)' : 'white'};
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.selected ? 'var(--primary-color)' : 'var(--secondary-color)'};
  }
`;

const OptionIcon = styled.div`
  font-size: 32px;
  margin-bottom: 12px;
  color: ${props => props.selected ? 'var(--primary-color)' : 'var(--text-secondary)'};
`;

const OptionTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  text-align: center;
`;

const OptionDescription = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
`;

const RadioInput = styled.input`
  position: absolute;
  opacity: 0;
  cursor: pointer;
`;

// Initial values for the form
const initialValues = {
  subreddits: ['all'],
  dateRange: {
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  },
  searchType: 'hot',
  customPrompt: '',
  voiceProvider: '',
  voiceId: '',
  scriptStyle: 'podcast',
  videoStyle: 'slideshow',
  uploadToYoutube: false
};

// Validation schema
const validationSchema = Yup.object({
  subreddits: Yup.array().min(1, 'At least one subreddit is required'),
  searchType: Yup.string().required('Search type is required'),
  voiceProvider: Yup.string().when('currentStep', {
    is: 2,
    then: Yup.string().required('Voice provider is required')
  }),
  voiceId: Yup.string().when('currentStep', {
    is: 2,
    then: Yup.string().required('Voice selection is required')
  }),
  scriptStyle: Yup.string().required('Script style is required'),
  videoStyle: Yup.string().required('Video style is required')
});

// Main component
function CreatePipeline() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Fetch voice providers
  const { data: voiceProviders, isLoading: providersLoading } = useQuery(
    'voice-providers',
    async () => {
      const response = await axios.get('/api/v1/voice/providers');
      return response.data.providers;
    }
  );
  
  // Fetch voices for selected provider
  const { data: voices, isLoading: voicesLoading, refetch: refetchVoices } = useQuery(
    ['voices', initialValues.voiceProvider],
    async () => {
      if (!initialValues.voiceProvider) return [];
      const response = await axios.get(`/api/v1/voice/voices/${initialValues.voiceProvider}`);
      return response.data.voices;
    },
    { enabled: false }
  );
  
  // Fetch script styles
  const { data: scriptStyles, isLoading: stylesLoading } = useQuery(
    'script-styles',
    async () => {
      const response = await axios.get('/api/v1/script/styles');
      return response.data.styles;
    }
  );
  
  // Fetch video styles
  const { data: videoStyles, isLoading: videoStylesLoading } = useQuery(
    'video-styles',
    async () => {
      const response = await axios.get('/api/v1/video/styles');
      return response.data.styles;
    }
  );
  
  // Pipeline execution mutation
  const pipelineMutation = useMutation(
    async (values) => {
      // Update progress as we go
      setProgress(10);
      
      const response = await axios.post('/api/v1/pipeline', values, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(10 + percentCompleted * 0.1); // 10-20% progress during upload
        }
      });
      
      // Simulate progress for the pipeline execution
      let currentProgress = 20;
      const progressInterval = setInterval(() => {
        currentProgress += 5;
        if (currentProgress >= 90) {
          clearInterval(progressInterval);
        }
        setProgress(currentProgress);
      }, 2000);
      
      return response.data;
    },
    {
      onSuccess: (data) => {
        setProgress(100);
        setPipelineResult(data);
        toast.success('Pipeline completed successfully!');
      },
      onError: (error) => {
        setProgress(0);
        toast.error(`Pipeline execution failed: ${error.response?.data?.error || error.message}`);
      }
    }
  );
  
  // Handle step navigation
  const handleNext = (values) => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Execute the pipeline
      pipelineMutation.mutate(values);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Render form based on current step
  const renderStepForm = (values, errors, touched, handleChange, setFieldValue) => {
    switch (currentStep) {
      case 1:
        return (
          <FormCard>
            <FormGroup>
              <Label htmlFor="subreddits">Subreddits</Label>
              <Input
                type="text"
                id="subreddits"
                name="subreddits"
                placeholder="Enter subreddit names (comma separated, e.g. 'askreddit,todayilearned')"
                onChange={(e) => {
                  const value = e.target.value;
                  const subreddits = value.split(',').map(s => s.trim()).filter(s => s);
                  setFieldValue('subreddits', subreddits);
                }}
                value={values.subreddits.join(', ')}
              />
              <ErrorMessage name="subreddits" component={ErrorText} />
            </FormGroup>
            
            <FormGroup>
              <Label>Search Type</Label>
              <OptionCards>
                {['hot', 'top', 'new', 'rising'].map((type) => (
                  <OptionCard 
                    key={type} 
                    selected={values.searchType === type}
                    onClick={() => setFieldValue('searchType', type)}
                  >
                    <OptionIcon selected={values.searchType === type}>
                      {type === 'hot' && '🔥'}
                      {type === 'top' && '⭐'}
                      {type === 'new' && '🆕'}
                      {type === 'rising' && '📈'}
                    </OptionIcon>
                    <OptionTitle>{type.charAt(0).toUpperCase() + type.slice(1)}</OptionTitle>
                    <RadioInput
                      type="radio"
                      name="searchType"
                      value={type}
                      checked={values.searchType === type}
                      onChange={() => setFieldValue('searchType', type)}
                    />
                  </OptionCard>
                ))}
              </OptionCards>
              <ErrorMessage name="searchType" component={ErrorText} />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
              <TextArea
                as="textarea"
                id="customPrompt"
                name="customPrompt"
                placeholder="Enter any specific criteria to look for in Reddit posts..."
              />
            </FormGroup>
          </FormCard>
        );
      
      case 2:
        return (
          <FormCard>
            <FormGroup>
              <Label htmlFor="voiceProvider">Voice Provider</Label>
              <Select
                as="select"
                id="voiceProvider"
                name="voiceProvider"
                onChange={(e) => {
                  handleChange(e);
                  setFieldValue('voiceId', '');
                  if (e.target.value) {
                    refetchVoices();
                  }
                }}
              >
                <option value="">Select a voice provider</option>
                {voiceProviders?.map(provider => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </Select>
              <ErrorMessage name="voiceProvider" component={ErrorText} />
            </FormGroup>
            
            {values.voiceProvider && (
              <FormGroup>
                <Label htmlFor="voiceId">Voice Selection</Label>
                {voicesLoading ? (
                  <div>Loading voices...</div>
                ) : (
                  <Select as="select" id="voiceId" name="voiceId">
                    <option value="">Select a voice</option>
                    {voices?.map(voice => (
                      <option key={voice.id} value={voice.id}>{voice.name} ({voice.gender})</option>
                    ))}
                  </Select>
                )}
                <ErrorMessage name="voiceId" component={ErrorText} />
              </FormGroup>
            )}
          </FormCard>
        );
      
      case 3:
        return (
          <FormCard>
            <FormGroup>
              <Label>Script Style</Label>
              <OptionCards>
                {scriptStyles?.map((style) => (
                  <OptionCard 
                    key={style}
                    selected={values.scriptStyle === style}
                    onClick={() => setFieldValue('scriptStyle', style)}
                  >
                    <OptionIcon selected={values.scriptStyle === style}>
                      {style === 'podcast' && '🎙️'}
                      {style === 'storytelling' && '📚'}
                      {style === 'educational' && '🎓'}
                      {style === 'humorous' && '😂'}
                      {style === 'newscast' && '📰'}
                    </OptionIcon>
                    <OptionTitle>{style.charAt(0).toUpperCase() + style.slice(1)}</OptionTitle>
                    <RadioInput
                      type="radio"
                      name="scriptStyle"
                      value={style}
                      checked={values.scriptStyle === style}
                      onChange={() => setFieldValue('scriptStyle', style)}
                    />
                  </OptionCard>
                ))}
              </OptionCards>
              <ErrorMessage name="scriptStyle" component={ErrorText} />
            </FormGroup>
          </FormCard>
        );
      
      case 4:
        return (
          <FormCard>
            <FormGroup>
              <Label>Video Style</Label>
              <OptionCards>
                {videoStyles?.map((style) => (
                  <OptionCard 
                    key={style.id}
                    selected={values.videoStyle === style.id}
                    onClick={() => setFieldValue('videoStyle', style.id)}
                  >
                    <OptionIcon selected={values.videoStyle === style.id}>
                      {style.id === 'podcast' && '🎙️'}
                      {style.id === 'slideshow' && '🖼️'}
                      {style.id === 'captions' && '💬'}
                      {style.id === 'reddit' && '📱'}
                    </OptionIcon>
                    <OptionTitle>{style.name}</OptionTitle>
                    <OptionDescription>{style.description}</OptionDescription>
                    <RadioInput
                      type="radio"
                      name="videoStyle"
                      value={style.id}
                      checked={values.videoStyle === style.id}
                      onChange={() => setFieldValue('videoStyle', style.id)}
                    />
                  </OptionCard>
                ))}
              </OptionCards>
              <ErrorMessage name="videoStyle" component={ErrorText} />
            </FormGroup>
            
            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  name="uploadToYoutube"
                />
                Upload to YouTube when done
              </CheckboxLabel>
            </FormGroup>
          </FormCard>
        );
      
      default:
        return null;
    }
  };
  
  // Render pipeline result
  const renderResult = () => {
    if (!pipelineResult) {
      return (
        <ResultCard>
          <ResultTitle>Creating Your Video</ResultTitle>
          <ProgressBar>
            <Progress value={progress} />
          </ProgressBar>
          <ProgressLabel>
            {progress < 20 ? 'Fetching Reddit trends...' :
             progress < 40 ? 'Generating script...' :
             progress < 60 ? 'Creating voice-over...' :
             progress < 80 ? 'Building video...' :
             progress < 100 ? 'Finalizing...' : 'Complete!'}
          </ProgressLabel>
        </ResultCard>
      );
    }
    
    return (
      <ResultCard>
        <ResultTitle>Video Created Successfully!</ResultTitle>
        
        <ResultDetails>
          <div>
            <DetailItem>
              <DetailLabel>Title</DetailLabel>
              <DetailValue>{pipelineResult.script.title}</DetailValue>
            </DetailItem>
            
            <DetailItem>
              <DetailLabel>Source</DetailLabel>
              <DetailValue>r/{pipelineResult.trend.source.subreddits.join(', r/')}</DetailValue>
            </DetailItem>
            
            <DetailItem>
              <DetailLabel>Duration</DetailLabel>
              <DetailValue>{pipelineResult.video.duration}s</DetailValue>
            </DetailItem>
          </div>
          
          <div>
            <DetailItem>
              <DetailLabel>Voice</DetailLabel>
              <DetailValue>{pipelineResult.voice.voiceId}</DetailValue>
            </DetailItem>
            
            <DetailItem>
              <DetailLabel>Style</DetailLabel>
              <DetailValue>{pipelineResult.video.style}</DetailValue>
            </DetailItem>
            
            {pipelineResult.youtube && (
              <DetailItem>
                <DetailLabel>YouTube</DetailLabel>
                <DetailValue>
                  <a href={pipelineResult.youtube.youtubeUrl} target="_blank" rel="noopener noreferrer">
                    View on YouTube
                  </a>
                </DetailValue>
              </DetailItem>
            )}
          </div>
        </ResultDetails>
        
        <VideoPreview>
          <Video 
            controls 
            src={`/api/v1/video/preview?path=${encodeURIComponent(pipelineResult.video.videoFile)}`}
          />
        </VideoPreview>
        
        <ButtonContainer>
          <BackButton onClick={() => navigate('/analytics')}>
            View Analytics
          </BackButton>
          <NextButton onClick={() => navigate('/create')}>
            Create Another
          </NextButton>
        </ButtonContainer>
      </ResultCard>
    );
  };
  
  return (
    <PageContainer>
      <Header>
        <Title>Create New Video</Title>
        <Subtitle>Use the wizard to create a new YouTube Short from trending Reddit content</Subtitle>
      </Header>
      
      <StepIndicator>
        <Step>
          <StepNumber active={currentStep === 1} completed={currentStep > 1}>
            {currentStep > 1 ? '✓' : 1}
          </StepNumber>
          <StepLabel active={currentStep === 1}>Reddit Trends</StepLabel>
        </Step>
        <Step>
          <StepNumber active={currentStep === 2} completed={currentStep > 2}>
            {currentStep > 2 ? '✓' : 2}
          </StepNumber>
          <StepLabel active={currentStep === 2}>Voice Selection</StepLabel>
        </Step>
        <Step>
          <StepNumber active={currentStep === 3} completed={currentStep > 3}>
            {currentStep > 3 ? '✓' : 3}
          </StepNumber>
          <StepLabel active={currentStep === 3}>Script Style</StepLabel>
        </Step>
        <Step>
          <StepNumber active={currentStep === 4} completed={false}>
            4
          </StepNumber>
          <StepLabel active={currentStep === 4}>Video Options</StepLabel>
        </Step>
      </StepIndicator>
      
      {pipelineResult || pipelineMutation.isLoading ? (
        renderResult()
      ) : (
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleNext}
        >
          {({ values, errors, touched, handleChange, setFieldValue }) => (
            <Form>
              {renderStepForm(values, errors, touched, handleChange, setFieldValue)}
              
              <ButtonContainer>
                {currentStep > 1 && (
                  <BackButton type="button" onClick={handleBack}>
                    Back
                  </BackButton>
                )}
                <NextButton type="submit">
                  {currentStep < 4 ? 'Next' : 'Create Video'}
                </NextButton>
              </ButtonContainer>
            </Form>
          )}
        </Formik>
      )}
    </PageContainer>
  );
}

export default CreatePipeline;