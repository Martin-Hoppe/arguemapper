import {
  faBan,
  faCaretDown,
  faCode,
  faImage,
  faSave,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import produce from "immer";
import _ from "lodash";
import { useConfirm } from "material-ui-confirm";
import React, { useCallback, useEffect, useState } from "react";
import * as cytoModel from "../model/cytoWrapper";
import { isAtom, isScheme } from "../model/node";
import { cyto2aif, cyto2protobuf, proto2json } from "../services/convert";
import * as date from "../services/date";
import { useGraph } from "./GraphContext";

const NULL_VALUE = "###NULL###";

function generateFilename() {
  return date.format(date.now(), "yyyy-MM-dd-HH-mm-ss");
}

// https://stackoverflow.com/a/55613750/7626878
async function downloadJson(data: any) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, ".json");
}

async function downloadBlob(data: Blob, suffix: string) {
  const href = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = href;
  link.download = generateFilename() + suffix;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function Inspector() {
  const { cy, updateGraph, exportState, resetGraph } = useGraph();
  // @ts-ignore
  const [element, setElement] = useState(cy?.data());
  const [hasChanged, setHasChanged] = useState(false);
  const confirm = useConfirm();
  const theme = useTheme();

  useEffect(() => {
    setElement(null);

    cy?.on("select", (e) => {
      setHasChanged(false);
      setElement(e.target.data());
    });
    cy?.on("unselect", (e) => {
      setHasChanged(false);
      // @ts-ignore
      setElement(cy?.data());
    });
  }, [cy, setHasChanged]);

  const handleChange = useCallback(
    (attr: string | string[]) => {
      // We need to return a function here, thus the nested callbacks
      return (
        event:
          | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
          | React.ChangeEvent<{
              name?: string;
              value: any;
              event: Event | React.SyntheticEvent<Element, Event>;
            }>
          | SelectChangeEvent<HTMLInputElement | string>
      ) => {
        setHasChanged(true);

        if (cy) {
          // Prevent the user from selecting another element.
          // Otherwise, the local changes would be lost.
          cy.elements().unselectify();

          // Update our interim element
          setElement((element: any) => {
            let newValue = event.target.value;

            // For select fields with optional values, convert "Undefined" to undefined.
            // This is hacky!
            if (newValue === NULL_VALUE) {
              newValue = undefined;
            }

            // As we cannot directly modify it, we need to "produce" a new one
            return produce(element, (draft: any) => {
              // Update the given attribute with the new value
              _.set(draft, attr, newValue);
            });
          });
        }
      };
    },
    [cy]
  );

  let fields = null;

  if (element && isScheme(element)) {
    fields = (
      <>
        <FormControl fullWidth>
          <InputLabel>Scheme Type</InputLabel>
          <Select
            value={element.type}
            label="Scheme Type"
            onChange={handleChange("type")}
            defaultValue={NULL_VALUE}
          >
            <MenuItem value={NULL_VALUE}>Unknown</MenuItem>
            {Object.entries(cytoModel.node.SchemeType).map(([key, value]) => (
              <MenuItem key={key} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Argumentation Scheme</InputLabel>
          <Select
            value={element.argumentationScheme}
            label="Argumentation Scheme"
            onChange={handleChange("argumentationScheme")}
            defaultValue={NULL_VALUE}
          >
            <MenuItem value={NULL_VALUE}>Unknown</MenuItem>
            {Object.entries(cytoModel.node.Scheme).map(([key, value]) => {
              return (
                <MenuItem key={key} value={value}>
                  {value}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </>
    );
  } else if (element && isAtom(element)) {
    fields = (
      <>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Text"
          value={element.text}
          onChange={handleChange("text")}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Original Text"
          value={element.reference?.text}
          onChange={handleChange(["resource", "text"])}
        />
      </>
    );
  } else if (element && element.source && element.target) {
    // edge
  } else {
    fields = (
      <div>
        <Accordion>
          <AccordionSummary expandIcon={<FontAwesomeIcon icon={faCaretDown} />}>
            <Typography variant="button">
              <FontAwesomeIcon icon={faTrashAlt} />
              &nbsp;Replace with
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  confirm().then(() => resetGraph(false));
                }}
              >
                Emtpy Graph
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  confirm().then(() => resetGraph(true));
                }}
              >
                Demo Graph
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<FontAwesomeIcon icon={faCaretDown} />}>
            <Typography variant="button">
              <FontAwesomeIcon icon={faCode} />
              &nbsp;Export
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Button
                variant="contained"
                onClick={() => {
                  downloadJson(proto2json(cyto2protobuf(exportState())));
                }}
              >
                Arguebuf
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  downloadJson(cyto2aif(exportState()));
                }}
              >
                AIF
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<FontAwesomeIcon icon={faCaretDown} />}>
            <Typography variant="button">
              <FontAwesomeIcon icon={faImage} />
              &nbsp;Render
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Button
                variant="contained"
                onClick={() => {
                  if (cy) {
                    downloadBlob(
                      cy.png({ output: "blob", scale: 2, full: true }),
                      ".png"
                    );
                  }
                }}
              >
                PNG (Transparent)
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (cy) {
                    downloadBlob(
                      cy.png({
                        output: "blob",
                        scale: 2,
                        full: true,
                        bg: theme.palette.background.default,
                      }),
                      ".png"
                    );
                  }
                }}
              >
                PNG (Background)
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (cy) {
                    downloadBlob(
                      cy.jpg({
                        output: "blob",
                        scale: 2,
                        full: true,
                        quality: 1,
                        bg: theme.palette.background.default,
                      }),
                      ".jpg"
                    );
                  }
                }}
              >
                JPG (Background)
              </Button>
              {theme.palette.mode === "dark" && (
                <Typography variant="caption">
                  <b>Please note:</b>
                  <br />
                  The rendering respects the dark mode. If you want a white
                  background, please switch to the light mode.
                </Typography>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </div>
    );
  }

  return (
    <>
      <Toolbar>
        <Typography variant="h5">Inspector</Typography>
      </Toolbar>
      <Stack spacing={3} sx={{ padding: 3 }}>
        {fields}
        {hasChanged && (
          <Stack
            justifyContent="space-around"
            direction="row"
            sx={{ width: 1 }}
          >
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faSave} />}
              onClick={() => {
                if (element) {
                  const cytoElem = cy?.$id(element.id);
                  cytoElem?.data(element);
                  updateGraph();
                }
                cy?.elements().selectify();
                setHasChanged(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<FontAwesomeIcon icon={faBan} />}
              onClick={() => {
                cy?.elements().selectify();
                cy?.elements().unselect();
                setHasChanged(false);
              }}
            >
              Discard
            </Button>
          </Stack>
        )}
      </Stack>
    </>
  );
}

export default Inspector;
