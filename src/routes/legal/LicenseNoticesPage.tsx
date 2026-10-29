import { AppShell } from '@/components/layout/AppShellView'
import { TranslatedText } from '@/i18n/translation'
import { toRelativeHref } from '@/lib/navigation'
import './license-notices.css'

export function LicenseNoticesPage() {
  return <AppShell><section className="legal-page">
    <div className="legal-page__panel">
      <header className="legal-page__heading">
        <h1><TranslatedText id="legal.licensesTitle" /></h1>
      </header>
      <div className="legal-page__content">
        <article className="legal-page__document license-notices__section" aria-labelledby="country-data-license">
          <h2 id="country-data-license">IP 국가 정보</h2>
          <p>상품의 IP 국가 정보에는 MaxMind GeoLite Country 데이터를 사용합니다. IP 기반 국가 정보는 추정값이며 PC의 실제 위치를 보증하지 않습니다.</p>
          <p className="notranslate" lang="en" translate="no">This product includes GeoLite Data created by MaxMind, available from <a href="https://www.maxmind.com" rel="noreferrer" target="_blank">https://www.maxmind.com</a>.</p>
          <p>이 데이터에는 <a href="https://www.maxmind.com/en/geolite/eula" rel="noreferrer" target="_blank">MaxMind GeoLite 이용약관</a>과 <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noreferrer" target="_blank">Creative Commons Attribution-ShareAlike 4.0 International</a> 조건이 적용됩니다. 국가 데이터는 수정하지 않고 조회에 사용합니다.</p>
        </article>
        <article className="legal-page__document license-notices__section" aria-labelledby="country-flags-license">
          <h2 id="country-flags-license">국가 아이콘</h2>
          <p>국가 아이콘에는 <a href="https://github.com/lipis/flag-icons" rel="noreferrer" target="_blank">flag-icons</a>를 사용합니다.</p>
          <p className="notranslate" lang="en" translate="no">Copyright (c) 2013 Panayiotis Lipiridis. Licensed under the MIT License.</p>
          <p><a href={toRelativeHref('/licenses/flag-icons-LICENSE.txt')} rel="noreferrer" target="_blank">MIT 라이선스 전문 보기</a></p>
        </article>
      </div>
    </div>
  </section></AppShell>
}
