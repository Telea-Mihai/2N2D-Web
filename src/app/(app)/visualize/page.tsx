'use client';
import React, { useState } from 'react';
import './styles.css';
import {
  createVisualNetwork2D,
  categoryColorMap,
  getNodeCategory,
  nodes,
  edges
} from '@/lib/frontend/feHandler';
import ONNXUploader from '@/components/fileUploadElements/ONNXUploader';
import {
  Session,
  updateSession,
  getSession
} from '@/lib/sessionHandling/sessionManager';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteOnnx } from '@/lib/sessionHandling/sessionUpdater';
import { Trans, useLingui } from '@lingui/react/macro';

export default function visualize() {
  //Session docs
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  //Onnx data
  const [result, setResult] = React.useState<any>(null);
  const [fileName, setFileName] = useState<string>('');

  //Settings
  const [constantsEnabled, setConstantsEnabled] = useState<boolean>(false);
  const [physicsEnabled, setPhysicsEnabled] = useState<boolean>(false);
  const [verticalView, setVerticalView] = useState<boolean>(false);

  //View expansion
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(false);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [legendExpanded, setLegendExpanded] = useState<boolean>(false);

  //selected
  const [selected, setSelected] = useState<any>(null);

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const { t } = useLingui();

  async function updateView() {
    let data = sessionStorage.getItem('modelData');

    setSelected(null);
    if (!data || data.length === 2) {
      setResult(null);
      if (!canvasRef.current) return;

      const ctx = canvasRef.current;
      if (ctx) {
        await createVisualNetwork2D(
          { nodes: [], edges: [] },
          ctx,
          false,
          false,
          false,
          handleSelect
        );
      }
      return;
    }

    data = JSON.parse(data);
    setResult(data);
    if (sessionStorage.getItem('modelName'))
      setFileName(sessionStorage.getItem('modelName')!);
    else setFileName('No model loaded');

    if (!canvasRef.current) return;

    if (!(data as any).nodes) return;

    const ctx = canvasRef.current;
    if (ctx) {
      await createVisualNetwork2D(
        data,
        ctx,
        constantsEnabled,
        physicsEnabled,
        verticalView,
        handleSelect
      );
    }
  }

  async function onLoad() {
    let session = null;
    const sessionId = sessionStorage.getItem('currentSessionId');
    if (sessionId) {
      session = await getSession(parseInt(sessionId));
      if (
        (session.visResult as any).nodes &&
        (session.visResult as any).summary
      ) {
        setCurrentSession(session);
        setResult(session.visResult);
      }
    } else {
      setCurrentSession(null);
      setResult(null);
      return;
    }

    updateView();
  }

  function titleFormat(title: string): any {
    const lines = title.trim().split('\n');
    const parsed: Record<
      string,
      string | string[] | Record<string, string | number> | number
    > = {};
    let currentAttr: Record<string, string | number> | null = null;

    for (const line of lines) {
      if (line.startsWith('attribute {')) {
        currentAttr = {};
        if (!parsed.attributes) parsed.attributes = [];
      } else if (line === '}') {
        if (currentAttr) {
          (parsed.attributes as any[]).push(currentAttr);
          currentAttr = null;
        }
      } else {
        const [rawKey, valueRaw] = line.split(': ');
        const value = valueRaw?.replace(/^"|"$/g, '');
        const key = rawKey.replace(/\s+/g, '');

        if (currentAttr) {
          if (!isNaN(Number(value))) {
            currentAttr[key] = Number(value);
          } else {
            currentAttr[key] = value;
          }
        } else {
          if (parsed[key]) {
            if (Array.isArray(parsed[key])) {
              parsed[key].push(value);
            } else {
              // @ts-ignore
              parsed[key] = [parsed[key], value];
            }
          } else {
            parsed[key] = value;
          }
        }
      }
    }

    return parsed;
  }

  function NodeDetails({ selected }: { selected: any }) {
    const options = titleFormat(selected.title);

    return (
      <div className='sArea nodeDetails p-0'>
        <div className={'subtitleWrapper'}>
          <h2
            className='subtitle'
            style={{ backgroundColor: selected.color.background }}
          >
            {selected.label.toString()}
          </h2>
        </div>

        <div className={'overflow-y-auto pt-0 pr-[2rem] pb-[2rem] pl-[2rem]'}>
          {options.name && (
            <p>
              <b>
                <Trans>Name:</Trans>
              </b>{' '}
              {options.name.toString()}
            </p>
          )}
          <p>
            <b>
              <Trans>Category:</Trans>
            </b>{' '}
            {getNodeCategory(selected.label)}
          </p>

          {options.input && (
            <div>
              <h2>
                <b>
                  <Trans>Inputs:</Trans>
                </b>
              </h2>
              <ul>
                {typeof options.input === 'string' ? (
                  <li>{options.input}</li>
                ) : (
                  options.input?.map((input: string, i: number) => (
                    <li key={i}>{input}</li>
                  ))
                )}
              </ul>
            </div>
          )}

          {options.output && (
            <div>
              <h2>
                <b>
                  <Trans>Outputs:</Trans>
                </b>
              </h2>
              <ul>
                {typeof options.output === 'string' ? (
                  <li>{options.output}</li>
                ) : (
                  options.output?.map((output: string, i: number) => (
                    <li key={i}>{output}</li>
                  ))
                )}
              </ul>
            </div>
          )}

          {options.attributes && (
            <div>
              <h2>
                <b>
                  <Trans>Attributes:</Trans>
                </b>
              </h2>
              <ul>
                {options.attributes.map((attr: any, i: number) => (
                  <li key={i}>
                    <b>{attr.name}</b>: {Object.values(attr)[1]}{' '}
                    <Trans>Type:</Trans> {attr.type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  function handleSelect(node: { id: number; label: string; title: string }) {
    setSelected(node);
  }

  async function clearData() {
    const curSesId = sessionStorage.getItem('currentSessionId');
    if (!curSesId) return;
    await deleteOnnx(parseInt(curSesId));

    setResult(null);
    setSelected(null);
    sessionStorage.removeItem('modelResponse');
    sessionStorage.removeItem('modelData');
    sessionStorage.removeItem('modelName');
    updateView();
  }

  React.useEffect(() => {
    onLoad();
  }, []);

  React.useEffect(() => {
    updateView();
  }, [constantsEnabled, physicsEnabled, verticalView]);

  return (
    <motion.main
      className='page'
      transition={{ delay: 0.4, duration: 0.2, ease: 'easeOut' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div id='network-2d' className='networkView' ref={canvasRef}></div>
      <div className='overlay'>
        <div>
          <motion.div layout className='sArea' transition={{ duration: 0.3 }}>
            <div
              className='setting'
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              <h3 className='subtitle'>
                <Trans>Model Details</Trans>
              </h3>
              <motion.i
                className='fa-solid fa-caret-down'
                animate={{ rotate: detailsExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <AnimatePresence initial={false}>
              {detailsExpanded && (
                <motion.div
                  layout
                  key='model-details'
                  initial={{ opacity: 0, height: 0, width: 0 }}
                  animate={{ opacity: 1, height: 'auto', width: 'auto' }}
                  exit={{ opacity: 0, height: 0, width: 0 }}
                  transition={{ duration: 0.3 }}
                  className='max-h-[100vh] overflow-y-auto'
                >
                  {result == null || !result.summary ? (
                    <Trans>No model loaded</Trans>
                  ) : (
                    <>
                      <div className='sArea'>
                        <h2>
                          <b>
                            <Trans>File:</Trans>
                          </b>{' '}
                          {fileName}
                        </h2>
                      </div>
                      <div className='sArea'>
                        <h2>
                          <b>
                            <Trans>Producer:</Trans>
                          </b>{' '}
                          {result.summary.producer}
                        </h2>
                        <h2>
                          <b>
                            <Trans>IR version:</Trans>
                          </b>{' '}
                          {result.summary.ir_version}
                        </h2>
                      </div>
                      <div className='sArea'>
                        <h2>
                          <b>
                            <Trans>Node count:</Trans>
                          </b>{' '}
                          {result.summary.node_count}
                        </h2>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div layout className='sArea' transition={{ duration: 0.3 }}>
            <div
              className='setting'
              onClick={() => setLegendExpanded(!legendExpanded)}
            >
              <h3 className='subtitle'>
                <Trans>Legend</Trans>
              </h3>
              <motion.i
                className='fa-solid fa-caret-down'
                animate={{ rotate: legendExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <AnimatePresence initial={false}>
              {legendExpanded && (
                <motion.div
                  layout
                  key='legend'
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {Object.entries(categoryColorMap).map(
                    ([category, { normal }]) => (
                      <div key={category.toString()} className='legendItem'>
                        <span className='legendLabel'>{category}</span>
                        <div
                          className='legendColor'
                          style={{ backgroundColor: `${normal}` }}
                        />
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div layout className='sArea' transition={{ duration: 0.3 }}>
            <div
              className='setting'
              onClick={() => setSettingsExpanded(!settingsExpanded)}
            >
              <h2 className='subtitle'>
                <Trans>Settings</Trans>
              </h2>
              <motion.i
                className='fa-solid fa-caret-down'
                animate={{ rotate: settingsExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <AnimatePresence initial={false}>
              {settingsExpanded && (
                <motion.div
                  layout
                  key='settings'
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className='setting'>
                    <label htmlFor='physics'>
                      <Trans>Node physics</Trans>
                    </label>
                    <input
                      type='checkbox'
                      id='physics'
                      checked={physicsEnabled}
                      onChange={(e) => setPhysicsEnabled(e.target.checked)}
                    />
                  </div>
                  <div className='setting'>
                    <label htmlFor='constants'>
                      <Trans>Constant nodes</Trans>
                    </label>
                    <input
                      type='checkbox'
                      id='constants'
                      checked={constantsEnabled}
                      onChange={(e) => setConstantsEnabled(e.target.checked)}
                    />
                  </div>
                  <div className='setting'>
                    <label htmlFor='vertical'>
                      <Trans>Vertical view</Trans>
                    </label>
                    <input
                      type='checkbox'
                      id='vertical'
                      checked={verticalView}
                      onChange={(e) => setVerticalView(e.target.checked)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className='sArea'>
            <button className='uploadButton' onClick={updateView}>
              <Trans>Refresh</Trans>{' '}
              <i className='fa-solid fa-arrows-rotate'></i>
            </button>
          </div>
        </div>

        <div className='titleWrapper'>
          <h1 className='title'>
            <Trans>Network Visualization</Trans>
          </h1>
          <div className='sArea vertical'>
            <div className='dataArea'>
              <ONNXUploader callBack={updateView} />
              <button className='deleteButton' onClick={clearData}>
                <Trans>Clear Data</Trans>{' '}
                <i className='fa-solid fa-trash-xmark'></i>
              </button>
            </div>
          </div>
        </div>
        {selected && <NodeDetails selected={selected} />}
      </div>
    </motion.main>
  );
}
