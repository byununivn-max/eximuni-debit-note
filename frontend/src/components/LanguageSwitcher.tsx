import React from 'react';
import { Dropdown, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';

const languages = [
  { key: 'ko', label: '🇰🇷 한국어' },
  { key: 'en', label: '🇺🇸 English' },
  { key: 'vi', label: '🇻🇳 Tiếng Việt' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const items: MenuProps['items'] = languages.map((lang) => ({
    key: lang.key,
    label: lang.label,
  }));

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    i18n.changeLanguage(key);
  };

  const currentLabel = languages.find((l) => l.key === i18n.language)?.label
    || languages.find((l) => i18n.language.startsWith(l.key))?.label
    || languages[0].label;

  return (
    <Dropdown menu={{ items, onClick: handleClick }} placement="bottomRight">
      <Button type="text" icon={<GlobalOutlined />}>
        {currentLabel}
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
