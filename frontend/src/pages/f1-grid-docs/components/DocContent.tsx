import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { F1GridDoc } from '../types';
import { DocCodeBlock } from './DocCodeBlock';

function slug(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getDocSectionId(docId: string, heading: string) {
  return `section-${slug(docId)}-${slug(heading)}`;
}

export function getDocApiRowId(heading: string, name: string) {
  return `api-${slug(heading)}-${slug(name)}`;
}

export function DocContent({
  doc,
  onRelatedSelect,
}: {
  doc: F1GridDoc;
  onRelatedSelect: (id: string) => void;
}) {
  return (
    <Box className="f1-doc-content">
      <Typography
        variant="overline"
        color="primary"
        className="f1-doc-category"
      >
        {doc.category === 'guide'
          ? '가이드'
          : doc.category === 'feature'
            ? '기능'
            : '참조'}
      </Typography>
      <Typography component="h1" variant="h3" className="f1-doc-title">
        {doc.title}
      </Typography>
      <Typography className="f1-doc-lede">{doc.description}</Typography>
      {doc.sections.map((section) => (
        <Box
          className="f1-doc-section"
          key={section.heading}
          id={getDocSectionId(doc.id, section.heading)}
        >
          <Typography
            component="h2"
            variant="h5"
            className="f1-doc-section-title"
            id={`${getDocSectionId(doc.id, section.heading)}-heading`}
          >
            {section.heading}
          </Typography>
          {section.type === 'prose' && (
            <Typography color="text.secondary">{section.body}</Typography>
          )}
          {section.type === 'code' && <DocCodeBlock code={section.code} />}
          {section.type === 'api' && (
            <TableContainer
              className="f1-doc-api-table-wrap"
              component="div"
              role="region"
              aria-label={`${section.heading} API 표`}
              tabIndex={0}
            >
              <Table size="small" aria-label={section.heading}>
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>타입 / 시그니처</TableCell>
                    <TableCell>기본값</TableCell>
                    <TableCell>설명 / 제약</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {section.rows.map(([name, type, description, defaultValue]) => (
                    <TableRow
                      key={name}
                      id={getDocApiRowId(section.heading, name)}
                      className="f1-doc-api-row"
                    >
                      <TableCell>
                        <code>{name}</code>
                      </TableCell>
                      <TableCell>
                        <code>{type}</code>
                      </TableCell>
                      <TableCell>{defaultValue ?? '—'}</TableCell>
                      <TableCell>{description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {section.type === 'related' &&
            section.links.map((link) => (
              <Chip
                key={link.id}
                label={link.label}
                onClick={() => onRelatedSelect(link.id)}
              />
            ))}
        </Box>
      ))}
    </Box>
  );
}
