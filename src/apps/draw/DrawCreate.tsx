import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import type { SxProps } from '@mui/joy/styles/types';
import { Box, Card, Skeleton } from '@mui/joy';

import type { ImageBlock } from '~/modules/blocks/blocks';
import { addDBAsset } from '~/modules/dblobs/dblobs.db';
import { createDBlobImageAsset } from '~/modules/dblobs/dblobs.types';
import { getActiveTextToImageProviderOrThrow, t2iGenerateImagesOrThrow } from '~/modules/t2i/t2i.client';

import type { TextToImageProvider } from '~/common/components/useCapabilities';
import { InlineError } from '~/common/components/InlineError';
import { ScrollToBottom } from '~/common/scroll-to-bottom/ScrollToBottom';
import { ScrollToBottomButton } from '~/common/scroll-to-bottom/ScrollToBottomButton';
import { createDMessageDataRefDBlob } from '~/common/stores/chat/chat.message';

import { DesignerPrompt, PromptComposer } from './create/PromptComposer';
import { ProviderConfigure } from './create/ProviderConfigure';
import { DrawSectionHeading } from './create/DrawSectionHeading';
import { FallbackUnconfigured } from './create/FallbackUnconfigured';
import { FallbackNoImages } from './create/FallbackNoImages';


const imagineWorkspaceSx: SxProps = {
  flexGrow: 1,
  overflowY: 'auto',

  // style
  backgroundColor: 'background.level3',
  boxShadow: 'inset 0 0 4px 0px rgba(0, 0, 0, 0.2)',

  // layout
  display: 'flex',
  flexDirection: 'column',
};

const imagineScrollContainerSx: SxProps = {
  flex: 1,
  overflowY: 'auto',
  position: 'relative',
  minHeight: 128,
};


/**
 * @returns up-to `vectorSize` image URLs
 */
async function queryActiveGenerateImageVector(singlePrompt: string, vectorSize: number = 1) {
  const t2iProvider = getActiveTextToImageProviderOrThrow();

  const images = await t2iGenerateImagesOrThrow(t2iProvider, singlePrompt, vectorSize);
  if (!images?.length)
    throw new Error('No image generated');

  // save the generated images
  for (const _i of images) {

    // Create DBlob image item
    const dblobImageItem = createDBlobImageAsset(
      singlePrompt,
      {
        mimeType: _i.mimeType as any, /* we assume the mime is supported */
        base64: _i.base64Data,
      },
      {
        ot: 'generated',
        source: 'ai-text-to-image',
        // generatorName: t2iProvider.painter,
        generatorName: _i.generatorName,
        prompt: _i.altText,
        parameters: _i.parameters,
        generatedAt: _i.generatedAt,
      },
      {
        width: _i.width || 0,
        height: _i.height || 0,
        // description: '',
      },
    );

    // Add to DBlobs database
    const dblobAssetId = await addDBAsset(dblobImageItem, 'global', 'app-draw');

    // Create a data reference for the image from the message
    const imagePartDataRef = createDMessageDataRefDBlob(dblobAssetId, _i.mimeType, _i.base64Data.length);

    // TODO: move to DMessageImagePart?
    console.log('TODO: notImplemented: imagePartDataRef: CRUD and View of blobs as ImageBlocks', imagePartDataRef);
  }

  // const block = heuristicMarkdownImageReferenceBlocks(images.join('\n'));
  // if (!block?.length)
  //   throw new Error('No URLs in the generated images');

  return [];
}


function TempPromptImageGen(props: { prompt: DesignerPrompt, sx?: SxProps }) {

  // NOTE: we shall consider a multidimensional shape-based design

  // derived state
  const { prompt: dp } = props;

  // external state
  const { data: imageBlocks, error, isLoading } = useQuery<ImageBlock[], Error>({
    enabled: !!dp.prompt,
    queryKey: ['draw-uuid', dp.uuid],
    queryFn: () => queryActiveGenerateImageVector(dp.prompt, dp._repeatCount),
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  return <>

    {error && <InlineError error={error} />}

    {Array.from({ length: dp._repeatCount }).map((_, index) => {
      const imgUid = `gen-img-${index}`;
      const imageBlock = imageBlocks?.[index] || null;
      return imageBlock
        // ? <RenderImage key={imgUid} imageBlock={imageBlock} noTooltip />
        ? <Box sx={{


          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative',
          mx: 'auto', my: 'auto', // mt: (index > 0 || !props.isFirst) ? 1.5 : 0,
          boxShadow: 'lg',
          backgroundColor: 'neutral.solidBg',

          '& picture': { display: 'flex' },
          '& img': { maxWidth: '100%', maxHeight: '100%' },

        }}>
          <picture><img src={imageBlock.url} alt={imageBlock.alt} /></picture>
        </Box>
        : <Card key={imgUid} sx={{ mb: 'auto' }}>
          <Skeleton animation='wave' variant='rectangular' sx={{ minWidth: 128, width: '100%', aspectRatio: 1 }} />
        </Card>;
    })}

  </>;
}


export function DrawCreate(props: {
  // layout
  isMobile: boolean,
  showHeader: boolean,
  onHideHeader: () => void,

  // provider
  mayWork: boolean
  providers: TextToImageProvider[],
  activeProviderId: string | null,
  setActiveProviderId: (providerId: (string | null)) => void,
}) {

  // state
  const [prompts, setPrompts] = React.useState<DesignerPrompt[]>([]);


  const handleStopDrawing = React.useCallback(() => {
    setPrompts([]);
  }, []);

  const handlePromptEnqueue = React.useCallback((prompts: DesignerPrompt[]) => {
    setPrompts((prevPrompts) => [...prompts, ...prevPrompts]);
  }, []);


  return <>

    {/* The container is a '100dvh flex column' with App background (see `pageCoreSx`) */}

    {/* Embossed Imagine Workspace */}
    <Box sx={imagineWorkspaceSx}>

      {/* This box is here to let ScrollToBottomButton anchor to this (relative) insted of the scroll-dependent ScrollToBottom */}
      <Box sx={imagineScrollContainerSx}>

        {/* [overlay] Welcoming header - Closeable */}
        {props.showHeader && (
          <DrawSectionHeading
            isBeta
            title='Imagine'
            subTitle={props.mayWork ? 'Model, Prompts, Go!' : 'No AI providers configured :('}
            chipText='Multi-model, AI Text-to-Image'
            highlight={props.mayWork}
            onRemoveHeading={props.onHideHeader}
            sx={{
              position: 'absolute',
              left: 0, top: 0, right: 0,
              zIndex: 1,
              m: { xs: 1, md: 2 },
              boxShadow: 'md',
            }}
          />
        )}

        <ScrollToBottom
          bootToBottom
          stickToBottomInitial
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1, md: 2 },
          }}
        >

          {/* Draw history (last 50) */}

          {/*<Box sx={{*/}
          {/*  // my: 'auto',*/}
          {/*  // display: 'flex', flexDirection: 'column', alignItems: 'center',*/}
          {/*  border: DEBUG_LAYOUT ? '1px solid purple' : undefined,*/}
          {/*  minHeight: '300px',*/}

          {/*  // layout*/}
          {/*  display: 'grid',*/}
          {/*  gridTemplateColumns: props.isMobile*/}
          {/*    ? 'repeat(auto-fit, minmax(320px, 1fr))'*/}
          {/*    : 'repeat(auto-fit, minmax(max(min(100%, 400px), 100%/5), 1fr))',*/}
          {/*  gap: { xs: 2, md: 2 },*/}
          {/*}}>*/}
          {/*  {prompts.map((prompt, _index) => {*/}
          {/*    return (*/}
          {/*      <TempPromptImageGen*/}
          {/*        key={prompt.uuid}*/}
          {/*        prompt={prompt}*/}
          {/*        sx={{*/}
          {/*          border: DEBUG_LAYOUT ? '1px solid green' : undefined,*/}
          {/*        }}*/}
          {/*      />*/}
          {/*    );*/}
          {/*  })}*/}
          {/*</Box>*/}

          {/* Fallbac*/}
          <FallbackNoImages />

          {/* End with this Unconfigured message */}
          {!props.mayWork && <FallbackUnconfigured />}


          {/* Visibility and actions are handled via Context */}
          <ScrollToBottomButton />

        </ScrollToBottom>

      </Box>


      {/* Prompt Composer - inside the workspace for root-scrollability */}
      <PromptComposer
        isMobile={props.isMobile}
        queueLength={prompts.length}
        onDrawingStop={handleStopDrawing}
        onPromptEnqueue={handlePromptEnqueue}
        sx={{
          flex: 0,
          backgroundColor: 'background.level2',
          borderTop: `1px solid`,
          borderTopColor: 'divider',
          p: { xs: 1, md: 2 },
        }}
      />

    </Box>

    {/* AI Service Provider Options */}
    <ProviderConfigure
      providers={props.providers}
      activeProviderId={props.activeProviderId}
      setActiveProviderId={props.setActiveProviderId}
      sx={{
        backgroundColor: 'background.level1',
        borderTop: `1px solid`,
        borderTopColor: 'divider',
        p: { xs: 1, md: 2 },
      }}
    />

  </>;
}