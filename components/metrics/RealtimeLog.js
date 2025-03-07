import React, { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { FixedSizeList } from 'react-window';
import firstBy from 'thenby';
import Icon from 'components/common/Icon';
import Dot from 'components/common/Dot';
import FilterButtons from 'components/common/FilterButtons';
import NoData from 'components/common/NoData';
import { getDeviceMessage, labels } from 'components/messages';
import useLocale from 'hooks/useLocale';
import useCountryNames from 'hooks/useCountryNames';
import { BROWSERS } from 'lib/constants';
import Bolt from 'assets/bolt.svg';
import Visitor from 'assets/visitor.svg';
import Eye from 'assets/eye.svg';
import { stringToColor } from 'lib/format';
import { dateFormat } from 'lib/date';
import { safeDecodeURI } from 'next-basics';
import styles from './RealtimeLog.module.css';

const TYPE_ALL = 0;
const TYPE_PAGEVIEW = 1;
const TYPE_SESSION = 2;
const TYPE_EVENT = 3;

const TYPE_ICONS = {
  [TYPE_PAGEVIEW]: <Eye />,
  [TYPE_SESSION]: <Visitor />,
  [TYPE_EVENT]: <Bolt />,
};

export default function RealtimeLog({ data, websites, websiteId }) {
  const intl = useIntl();
  const { locale } = useLocale();
  const countryNames = useCountryNames(locale);
  const [filter, setFilter] = useState(TYPE_ALL);

  const logs = useMemo(() => {
    const { pageviews, sessions, events } = data;
    const logs = [...pageviews, ...sessions, ...events].sort(firstBy('createdAt', -1));
    if (filter) {
      return logs.filter(row => getType(row) === filter);
    }
    return logs;
  }, [data, filter]);

  const uuids = useMemo(() => {
    return data.sessions.reduce((obj, { sessionId, sessionUuid }) => {
      obj[sessionId] = sessionUuid;
      return obj;
    }, {});
  }, [data]);

  const buttons = [
    {
      label: <FormattedMessage id="label.all" defaultMessage="All" />,
      value: TYPE_ALL,
    },
    {
      label: <FormattedMessage id="metrics.views" defaultMessage="Views" />,
      value: TYPE_PAGEVIEW,
    },
    {
      label: <FormattedMessage id="metrics.visitors" defaultMessage="Visitors" />,
      value: TYPE_SESSION,
    },
    {
      label: <FormattedMessage id="metrics.events" defaultMessage="Events" />,
      value: TYPE_EVENT,
    },
  ];

  function getType({ pageviewId, sessionId, eventId }) {
    if (eventId) {
      return TYPE_EVENT;
    }
    if (pageviewId) {
      return TYPE_PAGEVIEW;
    }
    if (sessionId) {
      return TYPE_SESSION;
    }
    return null;
  }

  function getIcon(row) {
    return TYPE_ICONS[getType(row)];
  }

  function getWebsite({ websiteId }) {
    return websites.find(n => n.id === websiteId);
  }

  function getDetail({
    eventName,
    pageviewId,
    sessionId,
    url,
    browser,
    os,
    country,
    device,
    websiteId,
  }) {
    if (eventName) {
      return <div>{eventName}</div>;
    }
    if (pageviewId) {
      const domain = getWebsite({ websiteId })?.domain;
      return (
        <a
          className={styles.link}
          href={`//${domain}${url}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {safeDecodeURI(url)}
        </a>
      );
    }
    if (sessionId) {
      return (
        <FormattedMessage
          id="message.log.visitor"
          defaultMessage="Visitor from {country} using {browser} on {os} {device}"
          values={{
            country: <b>{countryNames[country] || intl.formatMessage(labels.unknown)}</b>,
            browser: <b>{BROWSERS[browser]}</b>,
            os: <b>{os}</b>,
            device: <b>{intl.formatMessage(getDeviceMessage(device))}</b>,
          }}
        />
      );
    }
  }

  function getTime({ createdAt }) {
    return dateFormat(new Date(createdAt), 'pp', locale);
  }

  function getColor(row) {
    const { sessionId } = row;

    return stringToColor(uuids[sessionId] || `${sessionId}${getWebsite(row)}`);
  }

  const Row = ({ index, style }) => {
    const row = logs[index];
    return (
      <div className={styles.row} style={style}>
        <div>
          <Dot color={getColor(row)} />
        </div>
        <div className={styles.time}>{getTime(row)}</div>
        <div className={styles.detail}>
          <Icon className={styles.icon} icon={getIcon(row)} />
          {getDetail(row)}
        </div>
        {!websiteId && websites.length > 1 && (
          <div className={styles.website}>{getWebsite(row)?.domain}</div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.table}>
      <FilterButtons buttons={buttons} selected={filter} onClick={setFilter} />
      <div className={styles.header}>
        <FormattedMessage id="label.realtime-logs" defaultMessage="Realtime logs" />
      </div>
      <div className={styles.body}>
        {logs?.length === 0 && <NoData />}
        {logs?.length > 0 && (
          <FixedSizeList height={500} itemCount={logs.length} itemSize={50}>
            {Row}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
}
