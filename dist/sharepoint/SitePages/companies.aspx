<%@ Page Language="C#" MasterPageFile="~sitecollection/_catalogs/masterpage/shastan.master" Inherits="Microsoft.SharePoint.WebPartPages.WebPartPage, Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<asp:Content ContentPlaceHolderID="PlaceHolderPageTitle" runat="server">شرکت‌های تابعه | سکوی نوآوری و فناوری شستان</asp:Content>
<asp:Content ContentPlaceHolderID="PlaceHolderAdditionalPageHead" runat="server"><meta name="description" content="دایرکتوری شرکت‌های تابعه‌ی هلدینگ شستان"></asp:Content>
<asp:Content ContentPlaceHolderID="PlaceHolderMain" runat="server">
<div data-shn-page="companies" hidden></div>
<div class="tw-border-b tw-border-surface-line tw-bg-white">
      <div class="shn-container tw-py-8">
        <nav aria-label="مسیر صفحه" class="tw-text-xs tw-text-ink-muted"><a href="/SitePages/index.aspx" class="hover:tw-text-ocean-700">صفحه اصلی</a> <i class="fa-solid fa-chevron-left tw-mx-1 tw-text-[9px]" aria-hidden="true"></i> <span class="tw-font-bold tw-text-ink">شرکت‌های تابعه</span></nav>
        <div class="tw-mt-3 tw-flex tw-flex-col tw-gap-4 md:tw-flex-row md:tw-items-end md:tw-justify-between">
          <div>
            <h1 class="tw-text-2xl tw-font-bold sm:tw-text-3xl">شرکت‌های تابعه‌ی شستان</h1>
            <p class="tw-mt-2 tw-text-sm tw-text-ink-muted" data-shn="company-count">دایرکتوری شرکت‌های تولیدی و خدمات مهندسی در حوزه‌ی نفت، گاز، پتروشیمی و صنایع وابسته</p>
          </div>
          <form class="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row" data-shn="company-filters" role="search">
            <label class="tw-sr-only" for="cmp-q">جستجوی نام شرکت</label>
            <input id="cmp-q" name="q" type="search" class="shn-input sm:tw-w-64" placeholder="جستجوی نام شرکت…">
            <label class="tw-sr-only" for="cmp-cat">دسته‌بندی</label>
            <select id="cmp-cat" name="category" class="shn-input sm:tw-w-48"><option value="all">همه‌ی دسته‌ها</option></select>
          </form>
        </div>
      </div>
    </div>
    <div class="shn-container tw-py-8">
      <div class="tw-grid tw-grid-cols-1 tw-gap-5 md:tw-grid-cols-2 lg:tw-grid-cols-3" data-shn="companies" aria-live="polite"></div>
    </div>

</asp:Content>
